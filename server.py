import datetime
import logging
import re
import json
import os
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import mysql.connector
from mysql.connector import pooling
from dotenv import load_dotenv
from rag import load_pdf, chunk_text
from chatbot import stream_llm_with_context

# Load environment variables
load_dotenv()

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DocMind")

app = FastAPI(title="DocMind AI Backend")

# ── CORS Middleware ────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MySQL Configuration
db_host = os.getenv("DB_HOST", "127.0.0.1")
db_user = os.getenv("DB_USER", "root")
db_password = os.getenv("DB_PASSWORD", "")
db_name = os.getenv("DB_NAME", "docmind_db")
db_port = int(os.getenv("DB_PORT", 3306))

import threading

db_lock = threading.Lock()
db_pool = None

def initialize_db_pool():
    global db_pool
    if db_pool is not None:
        return db_pool
        
    with db_lock:
        # Check again under lock
        if db_pool is not None:
            return db_pool
            
        # 1. Resolve host and automatically fall back if it is a private Aiven host
        actual_host = db_host
        try:
            import socket
            socket.gethostbyname(actual_host)
        except socket.gaierror:
            # If resolution failed and host ends with .i.aivencloud.com, try public endpoint
            if ".i.aivencloud.com" in actual_host:
                public_host = actual_host.replace(".i.aivencloud.com", ".aivencloud.com")
                logger.warning(f"Internal host '{actual_host}' did not resolve. Falling back to public endpoint: '{public_host}'")
                try:
                    socket.gethostbyname(public_host)
                    actual_host = public_host
                except socket.gaierror:
                    logger.error(f"Fallback host '{public_host}' also failed to resolve.")
                    
        # 2. Rebuild SSL config for the resolved host
        local_ssl_config = {}
        if actual_host not in ["127.0.0.1", "localhost"]:
            ca_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ca.pem")
            if os.path.exists(ca_path):
                local_ssl_config["ssl_ca"] = ca_path
                local_ssl_config["ssl_verify_cert"] = True
                logger.info(f"Using SSL CA certificate from: {ca_path} for host: {actual_host}")
            else:
                logger.warning(f"Cloud DB detected ({actual_host}) but ca.pem not found. Attempting connection without SSL CA.")

        try:
            db_pool = pooling.MySQLConnectionPool(
                pool_name="docmind_pool",
                pool_size=10,
                host=actual_host,
                user=db_user,
                password=db_password,
                database=db_name,
                port=db_port,
                **local_ssl_config
            )
            logger.info(f"MySQL Connection Pool initialized successfully on host: {actual_host}")
            
            # Automatically verify and create tables if they do not exist
            conn = db_pool.get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    email VARCHAR(255) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chat_sessions (
                    id VARCHAR(255) PRIMARY KEY,
                    email VARCHAR(255),
                    pdf_name VARCHAR(255) NOT NULL,
                    pdf_pages INT NOT NULL,
                    word_count INT NOT NULL,
                    chunks LONGTEXT NOT NULL,
                    messages LONGTEXT NOT NULL,
                    timestamp VARCHAR(255) NOT NULL,
                    count INT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS logins (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    email VARCHAR(255) NOT NULL,
                    provider VARCHAR(50) NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_email (email)
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS page_views (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    email VARCHAR(255) DEFAULT NULL,
                    path VARCHAR(255) NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_email (email)
                )
            """)
            conn.commit()
            cursor.close()
            conn.close()
            logger.info("Database tables verified/created successfully.")
            return db_pool
        except Exception as e:
            logger.error(f"❌ CRITICAL: Could not initialize MySQL Connection Pool on host '{actual_host}': {e}")
            db_pool = None
            raise e

# Initial attempt on startup
try:
    initialize_db_pool()
except Exception:
    logger.warning("⚠️ MySQL Connection Pool initialization failed on startup. Will retry lazily on request.")

def get_db_connection():
    global db_pool
    if db_pool is None:
        try:
            initialize_db_pool()
        except Exception as e:
            raise HTTPException(500, f"Database connection pool is not initialized: {e}")
    try:
        return db_pool.get_connection()
    except Exception as e:
        logger.error(f"Failed to get db connection from pool: {e}")
        raise HTTPException(500, f"Database connection timeout or failure: {e}")

def is_valid_email(email):
    return re.match(r"[^@]+@[^@]+\.[^@]+", email)

import smtplib
import socket
import contextlib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

@contextlib.contextmanager
def force_ipv4():
    """Context manager to force socket resolution and connection to use IPv4 only."""
    original_getaddrinfo = socket.getaddrinfo
    def ipv4_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
        return original_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
    socket.getaddrinfo = ipv4_getaddrinfo
    try:
        yield
    finally:
        socket.getaddrinfo = original_getaddrinfo

def send_welcome_email(email, name):
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    
    if not smtp_user or not smtp_pass:
        logger.warning("⚠️ SMTP credentials missing. Skipping email.")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = f"DocMind AI <{smtp_user}>"
        msg['To'] = email
        msg['Subject'] = "Welcome to DocMind AI! 🧠"

        html = f"""
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
              <h2 style="color: #7C3AED;">Welcome to DocMind AI! 🧠</h2>
              <p>Hi <strong>{name}</strong>,</p>
              <p>We're thrilled to have you join DocMind AI! Your account has been successfully created.</p>
              <p>With DocMind AI, you can:</p>
              <ul>
                <li>Upload any PDF document.</li>
                <li>Ask complex questions and get instant, context-aware answers.</li>
                <li>Analyze documents with the speed of Groq LPU technology.</li>
              </ul>
              <p>Ready to get started? Head over to your dashboard and upload your first document!</p>
              <p>If you have any questions, feel free to reply to this email.</p>
              <p>Best regards,<br>The DocMind AI Team</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 0.8em; color: #777; text-align: center;">DocMind AI · Powered by Next.js & Groq</p>
            </div>
          </body>
        </html>
        """
        msg.attach(MIMEText(html, 'html'))

        smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        smtp_port_env = os.getenv("SMTP_PORT")

        sent = False
        last_error = None

        with force_ipv4():
            # If SMTP_PORT is explicitly specified, try it first
            if smtp_port_env:
                try:
                    port = int(smtp_port_env)
                    if port == 465:
                        logger.info(f"Attempting to send email via SMTP_SSL on {smtp_host}:{port}...")
                        with smtplib.SMTP_SSL(smtp_host, port, timeout=10) as server:
                            server.login(smtp_user, smtp_pass)
                            server.sendmail(smtp_user, email, msg.as_string())
                        sent = True
                    else:
                        logger.info(f"Attempting to send email via SMTP STARTTLS on {smtp_host}:{port}...")
                        with smtplib.SMTP(smtp_host, port, timeout=10) as server:
                            server.ehlo()
                            server.starttls()
                            server.ehlo()
                            server.login(smtp_user, smtp_pass)
                            server.sendmail(smtp_user, email, msg.as_string())
                        sent = True
                except smtplib.SMTPAuthenticationError as auth_err:
                    logger.error(f"❌ SMTP Authentication failed: {auth_err}")
                    return False
                except Exception as e:
                    logger.warning(f"⚠️ Configured SMTP sending on port {smtp_port_env} failed: {e}")
                    last_error = e

            # If not sent yet, try default SMTP ports in cascade
            if not sent:
                # 1. Try port 465 (SSL)
                try:
                    logger.info(f"Attempting SMTP_SSL on {smtp_host}:465...")
                    with smtplib.SMTP_SSL(smtp_host, 465, timeout=10) as server:
                        server.login(smtp_user, smtp_pass)
                        server.sendmail(smtp_user, email, msg.as_string())
                    sent = True
                except smtplib.SMTPAuthenticationError as auth_err:
                    logger.error(f"❌ SMTP Authentication failed during SSL fallback: {auth_err}")
                    return False
                except Exception as e_ssl:
                    logger.warning(f"⚠️ SMTP_SSL on port 465 failed: {e_ssl}")
                    last_error = e_ssl

                # 2. Try port 587 (STARTTLS)
                if not sent:
                    try:
                        logger.info(f"Attempting SMTP STARTTLS on {smtp_host}:587...")
                        with smtplib.SMTP(smtp_host, 587, timeout=10) as server:
                            server.ehlo()
                            server.starttls()
                            server.ehlo()
                            server.login(smtp_user, smtp_pass)
                            server.sendmail(smtp_user, email, msg.as_string())
                        sent = True
                    except smtplib.SMTPAuthenticationError as auth_err:
                        logger.error(f"❌ SMTP Authentication failed during STARTTLS fallback: {auth_err}")
                        return False
                    except Exception as e_tls:
                        logger.warning(f"⚠️ SMTP STARTTLS on port 587 failed: {e_tls}")
                        last_error = e_tls

        if sent:
            logger.info(f"✅ Welcome email sent to {email}")
            return True
        else:
            logger.error(f"❌ Failed to send welcome email after all attempts: {last_error}")
            return False
    except Exception as e:
        logger.error(f"❌ Failed to send welcome email (general exception): {e}")
        return False

def append_to_csv(filename, header, data_row):
    try:
        filepath = os.path.join(os.path.dirname(os.path.abspath(__file__)), filename)
        file_exists = os.path.exists(filepath)
        with open(filepath, "a", encoding="utf-8") as f:
            if not file_exists:
                f.write(header + "\n")
            formatted_row = ",".join(f'"{item}"' for item in data_row)
            f.write(formatted_row + "\n")
    except Exception as e:
        logger.error(f"Failed to append to CSV {filename}: {e}")

class AuthRequest(BaseModel):
    email: str
    password: str
    name: str = "User"

class OAuthLoginRequest(BaseModel):
    email: str
    name: str = "User"
    provider: str = "google"

class PageViewRequest(BaseModel):
    email: str | None = None
    path: str

class ChatSessionSaveRequest(BaseModel):
    id: str
    email: str
    name: str
    pdf: str
    pdf_pages: int = 0
    word_count: int = 0
    chunks: list[str] = []
    messages: list[dict] = []
    timestamp: str
    count: int

@app.post("/api/auth/signup")
async def signup(req: AuthRequest, background_tasks: BackgroundTasks):
    if not is_valid_email(req.email):
        raise HTTPException(400, "Invalid email format")
    
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if user already exists
        cursor.execute("SELECT email FROM users WHERE email = %s", (req.email,))
        user_exists = cursor.fetchone()
        
        is_new_user = False
        if user_exists:
            # Update password and name for existing user
            sql = "UPDATE users SET name = %s, password = %s WHERE email = %s"
            cursor.execute(sql, (req.name, req.password, req.email))
        else:
            # Create new user
            sql = "INSERT INTO users (email, name, password) VALUES (%s, %s, %s)"
            cursor.execute(sql, (req.email, req.name, req.password))
            is_new_user = True
            
        conn.commit()
        
        # Track registration in CSV
        timestamp = datetime.datetime.now().strftime("%d/%m/%Y, %i:%M:%S %p").lower()
        append_to_csv("signup_records.csv", "Timestamp,Email,Name,Status", [timestamp, req.email, req.name, "New" if is_new_user else "Updated"])
        
        if is_new_user:
            # Send welcome email only to brand new users
            background_tasks.add_task(send_welcome_email, req.email, req.name)
            return {"message": "Account created successfully", "is_new": True}
        else:
            logger.info(f"User {req.email} already exists. Profile updated. Skipping welcome email.")
            return {"message": "Account updated successfully", "is_new": False}
    except Exception as e:
        logger.error(f"Signup failed: {e}")
        raise HTTPException(500, f"Database error during signup: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/api/auth/login")
async def login(req: AuthRequest):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        sql = "SELECT email, name, password FROM users WHERE email = %s"
        cursor.execute(sql, (req.email,))
        row = cursor.fetchone()
        
        if not row:
            raise HTTPException(401, "Invalid credentials")
            
        email, name, password = row
        if password != req.password:
            raise HTTPException(401, "Invalid credentials")
            
        # Log login to DB logins table
        try:
            cursor.execute("INSERT INTO logins (email, provider) VALUES (%s, %s)", (email, "credentials"))
            conn.commit()
        except Exception as log_err:
            logger.error(f"Failed to log login in DB: {log_err}")
            
        # Log login to CSV file
        timestamp = datetime.datetime.now().strftime("%d/%m/%Y, %i:%M:%S %p").lower()
        append_to_csv("login_records.csv", "Timestamp,Email,Name,Provider", [timestamp, email, name, "credentials"])
            
        return {"message": "Login successful", "user": {"email": email, "name": name}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login failed: {e}")
        raise HTTPException(500, f"Database error during login: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/api/analytics/login")
async def log_oauth_login(req: OAuthLoginRequest):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Make sure user exists in users table (insert or update)
        cursor.execute("SELECT email FROM users WHERE email = %s", (req.email,))
        user_exists = cursor.fetchone()
        
        if not user_exists:
            # Create a placeholder user entry for OAuth logins so user queries work properly
            cursor.execute("INSERT INTO users (email, name, password) VALUES (%s, %s, %s)", (req.email, req.name, "oauth_authenticated"))
            # Track signup in CSV
            timestamp = datetime.datetime.now().strftime("%d/%m/%Y, %i:%M:%S %p").lower()
            append_to_csv("signup_records.csv", "Timestamp,Email,Name,Status", [timestamp, req.email, req.name, "OAuth_New"])
            
        # Log login in DB logins table
        cursor.execute("INSERT INTO logins (email, provider) VALUES (%s, %s)", (req.email, req.provider))
        conn.commit()
        
        # Log login to CSV file
        timestamp = datetime.datetime.now().strftime("%d/%m/%Y, %i:%M:%S %p").lower()
        append_to_csv("login_records.csv", "Timestamp,Email,Name,Provider", [timestamp, req.email, req.name, req.provider])
        
        return {"message": "OAuth login logged successfully"}
    except Exception as e:
        logger.error(f"Failed to log OAuth login: {e}")
        raise HTTPException(500, f"Database error logging OAuth login: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/api/analytics/pageview")
async def log_pageview(req: PageViewRequest):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO page_views (email, path) VALUES (%s, %s)", (req.email, req.path))
        conn.commit()
        
        # Log to page_views.csv
        timestamp = datetime.datetime.now().strftime("%d/%m/%Y, %i:%M:%S %p").lower()
        append_to_csv("page_views.csv", "Timestamp,Email,Path", [timestamp, req.email or "anonymous", req.path])
        
        return {"message": "Page view logged successfully"}
    except Exception as e:
        logger.error(f"Failed to log page view: {e}")
        raise HTTPException(500, f"Database error logging page view: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/admin/stats")
async def get_admin_stats():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        # Return dictionaries
        cursor = conn.cursor(dictionary=True)
        
        # 1. Total Page Views
        cursor.execute("SELECT COUNT(*) as total_views FROM page_views")
        total_views = cursor.fetchone()["total_views"]
        
        # 2. Total Registered Users
        cursor.execute("SELECT COUNT(*) as total_users FROM users")
        total_users = cursor.fetchone()["total_users"]
        
        # 3. Total Logins
        cursor.execute("SELECT COUNT(*) as total_logins FROM logins")
        total_logins = cursor.fetchone()["total_logins"]
        
        # 4. Recent Logins list (last 50)
        cursor.execute("""
            SELECT l.email, l.provider, l.timestamp, u.name 
            FROM logins l 
            LEFT JOIN users u ON l.email = u.email 
            ORDER BY l.id DESC LIMIT 50
        """)
        recent_logins = cursor.fetchall()
        # Format datetimes to strings
        for row in recent_logins:
            if row["timestamp"]:
                row["timestamp"] = row["timestamp"].strftime("%Y-%m-%d %H:%M:%S")
                
        # 5. Recent Registered Users (last 50)
        cursor.execute("SELECT email, name, created_at FROM users ORDER BY created_at DESC LIMIT 50")
        recent_users = cursor.fetchall()
        for row in recent_users:
            if row["created_at"]:
                row["created_at"] = row["created_at"].strftime("%Y-%m-%d %H:%M:%S")
                
        # 6. Page view summary by path
        cursor.execute("SELECT path, COUNT(*) as views FROM page_views GROUP BY path ORDER BY views DESC")
        path_summary = cursor.fetchall()
        
        # 7. Recent Page Views (last 50)
        cursor.execute("""
            SELECT pv.email, pv.path, pv.timestamp, u.name 
            FROM page_views pv 
            LEFT JOIN users u ON pv.email = u.email 
            ORDER BY pv.id DESC LIMIT 50
        """)
        recent_page_views = cursor.fetchall()
        for row in recent_page_views:
            if row["timestamp"]:
                row["timestamp"] = row["timestamp"].strftime("%Y-%m-%d %H:%M:%S")
        
        return {
            "total_views": total_views,
            "total_users": total_users,
            "total_logins": total_logins,
            "recent_logins": recent_logins,
            "recent_users": recent_users,
            "path_summary": path_summary,
            "recent_page_views": recent_page_views
        }
    except Exception as e:
        logger.error(f"Failed to fetch admin stats: {e}")
        raise HTTPException(500, f"Database error fetching admin stats: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/auth/status/{email}")
async def get_status(email: str):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT email FROM users WHERE email = %s", (email,))
        row = cursor.fetchone()
        return {"registered": row is not None}
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return {"registered": False, "error": str(e)}
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/chats/{email}")
async def get_chats(email: str):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        sql = """
            SELECT id, pdf_name, pdf_pages, word_count, chunks, messages, timestamp, count 
            FROM chat_sessions 
            WHERE email = %s
        """
        cursor.execute(sql, (email,))
        rows = cursor.fetchall()
        
        sessions = []
        for row in rows:
            sid, pdf_name, pdf_pages, word_count, chunks_str, messages_str, timestamp, count = row
            sessions.append({
                "id": sid,
                "pdf": pdf_name,
                "email": email,
                "pdf_pages": pdf_pages,
                "word_count": word_count,
                "chunks": json.loads(chunks_str) if chunks_str else [],
                "messages": json.loads(messages_str) if messages_str else [],
                "timestamp": timestamp,
                "count": count
            })
        return sessions
    except Exception as e:
        logger.error(f"Failed to fetch chats: {e}")
        raise HTTPException(500, f"Database error: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/api/chats")
async def save_chat(req: ChatSessionSaveRequest):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        chunks_str = json.dumps(req.chunks)
        messages_str = json.dumps(req.messages)
        
        sql = """
            INSERT INTO chat_sessions (id, email, pdf_name, pdf_pages, word_count, chunks, messages, timestamp, count)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
                messages = VALUES(messages), 
                count = VALUES(count), 
                timestamp = VALUES(timestamp)
        """
        cursor.execute(sql, (
            req.id, 
            req.email, 
            req.pdf, 
            req.pdf_pages, 
            req.word_count, 
            chunks_str, 
            messages_str, 
            req.timestamp, 
            req.count
        ))
        conn.commit()
        return {"message": "Chat session saved successfully"}
    except Exception as e:
        logger.error(f"Failed to save chat session: {e}")
        raise HTTPException(500, f"Database error: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.delete("/api/chats/{session_id}")
async def delete_chat(session_id: str):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM chat_sessions WHERE id = %s", (session_id,))
        conn.commit()
        return {"message": "Chat session deleted successfully"}
    except Exception as e:
        logger.error(f"Failed to delete chat session: {e}")
        raise HTTPException(500, f"Database error: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/chats/session/{session_id}")
async def get_chat_session(session_id: str):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        sql = """
            SELECT id, pdf_name, pdf_pages, word_count, chunks, messages, timestamp, count 
            FROM chat_sessions 
            WHERE id = %s
        """
        cursor.execute(sql, (session_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(404, "Chat session not found")
            
        sid, pdf_name, pdf_pages, word_count, chunks_str, messages_str, timestamp, count = row
        return {
            "id": sid,
            "pdf": pdf_name,
            "pdf_pages": pdf_pages,
            "word_count": word_count,
            "chunks": json.loads(chunks_str) if chunks_str else [],
            "messages": json.loads(messages_str) if messages_str else [],
            "timestamp": timestamp,
            "count": count
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch chat session: {e}")
        raise HTTPException(500, f"Database error: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/")
@app.head("/")
@app.get("/health")
@app.head("/health")
async def root():
    db_status = "Disconnected"
    db_error = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        conn.close()
        db_status = "Connected"
    except Exception as e:
        db_error = str(e)
        logger.warning(f"Health check: Database ping failed: {e}")
        
    return {
        "status": "Online",
        "service": "DocMind AI Backend",
        "database": db_status,
        "database_error": db_error,
        "timestamp": datetime.datetime.now().isoformat()
    }

# ── 1. PDF Upload ──────────────────────────────────────────────────────────────
@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    logger.info(f"📤 Upload request received for file: {file.filename}")
    try:
        text, page_count = load_pdf(file.file)
        if not text:
            logger.warning(f"❌ Text extraction failed for {file.filename}")
            raise HTTPException(400, "Could not extract text from PDF. It might be empty or image-based.")
        
        chunks = chunk_text(text)
        logger.info(f"✅ Extracted {page_count} pages and created {len(chunks)} chunks.")
        return {"chunks": chunks, "page_count": page_count, "filename": file.filename}
    except Exception as e:
        logger.error(f"🚨 Critical upload error: {str(e)}")
        raise HTTPException(500, f"Server error: {str(e)}")

# ── 2. Chat ────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    question: str
    chunks: list[str]

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    logger.info(f"💬 Chat request: {req.question[:50]}...")
    try:
        return StreamingResponse(
            stream_llm_with_context(req.question, req.chunks),
            media_type="text/event-stream"
        )
    except Exception as e:
        logger.error(f"🚨 Chat error: {str(e)}")
        raise HTTPException(500, f"AI logic failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    logger.info(f"🚀 Starting DocMind AI server on port {port}...")
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)