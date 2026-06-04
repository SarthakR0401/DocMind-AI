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

# SSL/CA configuration for cloud databases like Aiven
ssl_config = {}
if db_host not in ["127.0.0.1", "localhost"]:
    ca_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ca.pem")
    if os.path.exists(ca_path):
        ssl_config["ssl_ca"] = ca_path
        ssl_config["ssl_verify_cert"] = True
        logger.info(f"Using SSL CA certificate from: {ca_path}")
    else:
        logger.warning("Cloud DB detected but ca.pem not found. Attempting connection without SSL CA.")

try:
    db_pool = pooling.MySQLConnectionPool(
        pool_name="docmind_pool",
        pool_size=10,
        host=db_host,
        user=db_user,
        password=db_password,
        database=db_name,
        port=db_port,
        **ssl_config
    )
    logger.info("MySQL Connection Pool initialized successfully.")
except Exception as e:
    logger.error(f"❌ CRITICAL: Could not initialize MySQL Connection Pool: {e}")
    db_pool = None

def get_db_connection():
    if db_pool is None:
        raise HTTPException(500, "Database connection pool is not initialized")
    try:
        return db_pool.get_connection()
    except Exception as e:
        logger.error(f"Failed to get db connection from pool: {e}")
        raise HTTPException(500, "Database connection timeout or failure")

def is_valid_email(email):
    return re.match(r"[^@]+@[^@]+\.[^@]+", email)

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

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

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, email, msg.as_string())
        
        logger.info(f"✅ Welcome email sent to {email}")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to send welcome email: {e}")
        return False

class AuthRequest(BaseModel):
    email: str
    password: str
    name: str = "User"

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
        sql = """
            INSERT INTO users (email, name, password) 
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE name = VALUES(name), password = VALUES(password)
        """
        cursor.execute(sql, (req.email, req.name, req.password))
        conn.commit()
        
        # Send welcome email in background
        background_tasks.add_task(send_welcome_email, req.email, req.name)
        
        return {"message": "Account created/updated successfully"}
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
            
        return {"message": "Login successful", "user": {"email": email, "name": name}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login failed: {e}")
        raise HTTPException(500, f"Database error during login: {e}")
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

@app.get("/")
async def root():
    return {
        "status": "Online",
        "service": "DocMind AI Backend",
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