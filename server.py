import datetime
import logging
import re
import json
import os
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Header, Request, Form
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
                    expiry_hours INT DEFAULT NULL,
                    FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS logins (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    email VARCHAR(255) NOT NULL,
                    provider VARCHAR(50) NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    country VARCHAR(100) DEFAULT NULL,
                    city VARCHAR(100) DEFAULT NULL,
                    INDEX idx_email (email)
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS page_views (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    email VARCHAR(255) DEFAULT NULL,
                    path VARCHAR(255) NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    country VARCHAR(100) DEFAULT NULL,
                    city VARCHAR(100) DEFAULT NULL,
                    INDEX idx_email (email)
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS workspaces (
                    id VARCHAR(255) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS password_resets (
                    email VARCHAR(255) PRIMARY KEY,
                    token VARCHAR(255) NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
                )
            """)
            # Run alter table commands safely to migate existing databases
            for tbl in ["logins", "page_views"]:
                try:
                    cursor.execute(f"ALTER TABLE {tbl} ADD COLUMN country VARCHAR(100) DEFAULT NULL")
                except Exception:
                    pass
                try:
                    cursor.execute(f"ALTER TABLE {tbl} ADD COLUMN city VARCHAR(100) DEFAULT NULL")
                except Exception:
                    pass
            try:
                cursor.execute("ALTER TABLE chat_sessions ADD COLUMN expiry_hours INT DEFAULT NULL")
            except Exception:
                pass
            try:
                cursor.execute("ALTER TABLE chat_sessions ADD COLUMN workspace_id VARCHAR(255) DEFAULT NULL")
            except Exception:
                pass
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

def send_custom_email(email, subject, html):
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    
    if not smtp_user or not smtp_pass:
        logger.warning(f"⚠️ SMTP credentials missing. Skipping email: {subject}")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = f"DocMind AI <{smtp_user}>"
        msg['To'] = email
        msg['Subject'] = subject
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
            logger.info(f"✅ Email '{subject}' successfully sent to {email}")
            return True
        else:
            logger.error(f"❌ Failed to send email '{subject}' to {email}: {last_error}")
            return False
    except Exception as e:
        logger.error(f"❌ Failed to send email (general exception): {e}")
        return False

def send_welcome_email(email, name):
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
    return send_custom_email(email, "Welcome to DocMind AI! 🧠", html)

def send_password_reset_email(email, name, token):
    frontend_url = os.getenv("NEXTAUTH_URL", "http://localhost:3000")
    reset_link = f"{frontend_url}?resetToken={token}&resetEmail={email}"
    
    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
          <h2 style="color: #7C3AED;">DocMind AI - Reset Password Request 🔒</h2>
          <p>Hi <strong>{name}</strong>,</p>
          <p>We received a request to reset the password for your DocMind AI account. Click the button below to establish a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_link}" style="background-color: #7C3AED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p>If the button doesn't work, copy and paste the following link directly in your browser address bar:</p>
          <p style="word-break: break-all; color: #4F46E5;"><a href="{reset_link}">{reset_link}</a></p>
          <p><strong>Note:</strong> This link is only valid for 1 hour. If you did not make this request, you can safely ignore this email.</p>
          <p>Best regards,<br>The DocMind AI Team</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 0.8em; color: #777; text-align: center;">DocMind AI · Secure Document Assistant</p>
        </div>
      </body>
    </html>
    """
    return send_custom_email(email, "Reset Password Request - DocMind AI 🔒", html)

def send_password_reset_confirmation_email(email, name):
    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
          <h2 style="color: #059669;">DocMind AI - Password Reset Successful ✅</h2>
          <p>Hi <strong>{name}</strong>,</p>
          <p>This is a confirmation email to notify you that the password for your DocMind AI account has been successfully updated.</p>
          <p>If you did not perform this action, please secure your account immediately or contact support.</p>
          <p>Best regards,<br>The DocMind AI Team</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 0.8em; color: #777; text-align: center;">DocMind AI · Secure Document Assistant</p>
        </div>
      </body>
    </html>
    """
    return send_custom_email(email, "Password Reset Successful - DocMind AI ✅", html)

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

import requests

def resolve_ip_location(ip: str):
    """Resolve an IP address to Country and City using ip-api.com."""
    if not ip or ip in ["127.0.0.1", "localhost", "::1"] or ip.startswith("192.168.") or ip.startswith("10.") or ip.startswith("172."):
        return "Unknown Country", "Localhost"
    try:
        url = f"http://ip-api.com/json/{ip}"
        res = requests.get(url, timeout=2)
        if res.status_code == 200:
            data = res.json()
            if data.get("status") == "success":
                country = data.get("country", "Unknown Country")
                city = data.get("city", "Unknown City")
                return country, city
    except Exception as e:
        logger.error(f"Failed to geolocate IP {ip}: {e}")
    return "Unknown Country", "Unknown City"

def get_client_ip(request: Request):
    """Extract client IP addressing proxy headers first."""
    x_forwarded_for = request.headers.get("X-Forwarded-For")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    x_real_ip = request.headers.get("X-Real-IP")
    if x_real_ip:
        return x_real_ip.strip()
    return request.client.host if request.client else "127.0.0.1"

def resolve_coords_location(lat: float, lon: float):
    """Resolve latitude/longitude coordinates to Country and City using Nominatim (OpenStreetMap)."""
    try:
        headers = {
            "User-Agent": "DocMind-AI-Analytics-Agent/1.0"
        }
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=10"
        res = requests.get(url, headers=headers, timeout=3)
        if res.status_code == 200:
            data = res.json()
            address = data.get("address", {})
            country = address.get("country", "Unknown Country")
            city = address.get("city") or address.get("town") or address.get("village") or address.get("suburb") or "Unknown City"
            return country, city
    except Exception as e:
        logger.error(f"Failed to reverse geolocate coords ({lat}, {lon}): {e}")
    return None, None

def get_request_location(ip: str, lat: float | None = None, lon: float | None = None):
    """Resolve location using coordinates (high accuracy) or fallback to IP Geolocation."""
    if lat is not None and lon is not None:
        country, city = resolve_coords_location(lat, lon)
        if country and city:
            return country, city
    return resolve_ip_location(ip)

class AuthRequest(BaseModel):
    email: str
    password: str
    name: str = "User"
    latitude: float | None = None
    longitude: float | None = None

class OAuthLoginRequest(BaseModel):
    email: str
    name: str = "User"
    provider: str = "google"

class PageViewRequest(BaseModel):
    email: str | None = None
    path: str
    latitude: float | None = None
    longitude: float | None = None

class WorkspaceCreateRequest(BaseModel):
    id: str
    name: str
    email: str

class WorkspaceChatRequest(BaseModel):
    question: str
    workspace_id: str
    history: list[dict] = []

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    token: str
    password: str

class UserUpdateRequest(BaseModel):
    email: str
    name: str
    password: str | None = None
    old_password: str | None = None

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
    expiry_hours: int | None = None
    workspace_id: str | None = None

@app.post("/api/auth/signup")
async def signup(req: AuthRequest, background_tasks: BackgroundTasks, request: Request):
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
        
        # Get location details
        client_ip = get_client_ip(request)
        country, city = get_request_location(client_ip, req.latitude, req.longitude)
        
        # Track registration in CSV
        timestamp = datetime.datetime.now().strftime("%d/%m/%Y, %i:%M:%S %p").lower()
        append_to_csv("signup_records.csv", "Timestamp,Email,Name,Status,Country,City", [timestamp, req.email, req.name, "New" if is_new_user else "Updated", country, city])
        
        if is_new_user:
            # Welcome email is disabled on registration/login
            # background_tasks.add_task(send_welcome_email, req.email, req.name)
            return {"message": "Account created successfully", "is_new": True}
        else:
            logger.info(f"User {req.email} already exists. Profile updated.")
            return {"message": "Account updated successfully", "is_new": False}
    except Exception as e:
        logger.error(f"Signup failed: {e}")
        raise HTTPException(500, f"Database error during signup: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/api/auth/login")
async def login(req: AuthRequest, request: Request):
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
            
        # Get client IP and resolve location
        client_ip = get_client_ip(request)
        country, city = get_request_location(client_ip, req.latitude, req.longitude)
            
        # Log login to DB logins table
        try:
            cursor.execute(
                "INSERT INTO logins (email, provider, country, city) VALUES (%s, %s, %s, %s)", 
                (email, "credentials", country, city)
            )
            conn.commit()
        except Exception as log_err:
            logger.error(f"Failed to log login in DB: {log_err}")
            
        # Log login to CSV file
        timestamp = datetime.datetime.now().strftime("%d/%m/%Y, %i:%M:%S %p").lower()
        append_to_csv("login_records.csv", "Timestamp,Email,Name,Provider,Country,City", [timestamp, email, name, "credentials", country, city])
            
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
async def log_oauth_login(req: OAuthLoginRequest, request: Request):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get client IP and resolve location
        client_ip = get_client_ip(request)
        country, city = resolve_ip_location(client_ip)
        
        # Make sure user exists in users table (insert or update)
        cursor.execute("SELECT email FROM users WHERE email = %s", (req.email,))
        user_exists = cursor.fetchone()
        
        if not user_exists:
            # Create a placeholder user entry for OAuth logins so user queries work properly
            cursor.execute("INSERT INTO users (email, name, password) VALUES (%s, %s, %s)", (req.email, req.name, "oauth_authenticated"))
            # Track signup in CSV
            timestamp = datetime.datetime.now().strftime("%d/%m/%Y, %i:%M:%S %p").lower()
            append_to_csv("signup_records.csv", "Timestamp,Email,Name,Status,Country,City", [timestamp, req.email, req.name, "OAuth_New", country, city])
            
        # Log login in DB logins table
        cursor.execute(
            "INSERT INTO logins (email, provider, country, city) VALUES (%s, %s, %s, %s)", 
            (req.email, req.provider, country, city)
        )
        conn.commit()
        
        # Log login to CSV file
        timestamp = datetime.datetime.now().strftime("%d/%m/%Y, %i:%M:%S %p").lower()
        append_to_csv("login_records.csv", "Timestamp,Email,Name,Provider,Country,City", [timestamp, req.email, req.name, req.provider, country, city])
        
        return {"message": "OAuth login logged successfully"}
    except Exception as e:
        logger.error(f"Failed to log OAuth login: {e}")
        raise HTTPException(500, f"Database error logging OAuth login: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/api/analytics/pageview")
async def log_pageview(req: PageViewRequest, request: Request):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get client IP and resolve location
        client_ip = get_client_ip(request)
        country, city = get_request_location(client_ip, req.latitude, req.longitude)
        
        cursor.execute(
            "INSERT INTO page_views (email, path, country, city) VALUES (%s, %s, %s, %s)", 
            (req.email, req.path, country, city)
        )
        conn.commit()
        
        # Log to page_views.csv
        timestamp = datetime.datetime.now().strftime("%d/%m/%Y, %i:%M:%S %p").lower()
        append_to_csv("page_views.csv", "Timestamp,Email,Path,Country,City", [timestamp, req.email or "anonymous", req.path, country, city])
        
        return {"message": "Page view logged successfully"}
    except Exception as e:
        logger.error(f"Failed to log page view: {e}")
        raise HTTPException(500, f"Database error logging page view: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.get("/api/admin/stats")
async def get_admin_stats(authorization: str | None = Header(None)):
    admin_emails_env = os.getenv("ADMIN_EMAILS", "sarthakrathi04@gmail.com")
    admin_emails = [e.strip() for e in admin_emails_env.split(",") if e.strip()]
    
    authorized = False
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        if token in admin_emails:
            authorized = True
            
    if not authorized:
        raise HTTPException(403, "Access Denied: Invalid admin credentials")

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
            SELECT l.email, l.provider, l.timestamp, l.country, l.city, u.name 
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
            SELECT pv.email, pv.path, pv.timestamp, pv.country, pv.city, u.name 
            FROM page_views pv 
            LEFT JOIN users u ON pv.email = u.email 
            ORDER BY pv.id DESC LIMIT 50
        """)
        recent_page_views = cursor.fetchall()
        for row in recent_page_views:
            if row["timestamp"]:
                row["timestamp"] = row["timestamp"].strftime("%Y-%m-%d %H:%M:%S")
                
        # 8. Country breakdown of page views
        cursor.execute("""
            SELECT COALESCE(country, 'Unknown') as country, COUNT(*) as count 
            FROM page_views 
            GROUP BY country 
            ORDER BY count DESC 
            LIMIT 10
        """)
        country_summary = cursor.fetchall()
        
        # 9. Daily activity over the last 7 days
        cursor.execute("""
            SELECT DATE(timestamp) as date_val, COUNT(*) as views 
            FROM page_views 
            WHERE timestamp >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(timestamp)
            ORDER BY DATE(timestamp) ASC
        """)
        activity_rows = cursor.fetchall()
        
        # Fill missing days with 0 views to ensure a smooth 7-day line chart
        import datetime as dt_mod
        daily_activity = []
        activity_dict = {}
        for row in activity_rows:
            d_val = row["date_val"]
            if isinstance(d_val, dt_mod.date):
                d_str = d_val.strftime("%Y-%m-%d")
            elif isinstance(d_val, str):
                d_str = d_val.split(" ")[0]
            else:
                d_str = str(d_val)
            activity_dict[d_str] = row["views"]
            
        for i in range(6, -1, -1):
            day = (dt_mod.date.today() - dt_mod.timedelta(days=i)).strftime("%Y-%m-%d")
            daily_activity.append({
                "date": day,
                "views": activity_dict.get(day, 0)
            })
        
        return {
            "total_views": total_views,
            "total_users": total_users,
            "total_logins": total_logins,
            "recent_logins": recent_logins,
            "recent_users": recent_users,
            "path_summary": path_summary,
            "recent_page_views": recent_page_views,
            "country_summary": country_summary,
            "daily_activity": daily_activity
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
            SELECT id, pdf_name, pdf_pages, word_count, chunks, messages, timestamp, count, expiry_hours, workspace_id 
            FROM chat_sessions 
            WHERE email = %s
        """
        cursor.execute(sql, (email,))
        rows = cursor.fetchall()
        
        sessions = []
        for row in rows:
            sid, pdf_name, pdf_pages, word_count, chunks_str, messages_str, timestamp, count, expiry_hours, workspace_id = row
            sessions.append({
                "id": sid,
                "pdf": pdf_name,
                "email": email,
                "pdf_pages": pdf_pages,
                "word_count": word_count,
                "chunks": json.loads(chunks_str) if chunks_str else [],
                "messages": json.loads(messages_str) if messages_str else [],
                "timestamp": timestamp,
                "count": count,
                "expiry_hours": expiry_hours,
                "workspace_id": workspace_id
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
            INSERT INTO chat_sessions (id, email, pdf_name, pdf_pages, word_count, chunks, messages, timestamp, count, expiry_hours, workspace_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
                messages = VALUES(messages), 
                count = VALUES(count), 
                timestamp = VALUES(timestamp),
                expiry_hours = VALUES(expiry_hours),
                workspace_id = VALUES(workspace_id)
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
            req.count,
            req.expiry_hours,
            req.workspace_id
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
            SELECT id, pdf_name, pdf_pages, word_count, chunks, messages, timestamp, count, expiry_hours, workspace_id 
            FROM chat_sessions 
            WHERE id = %s
        """
        cursor.execute(sql, (session_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(404, "Chat session not found")
            
        sid, pdf_name, pdf_pages, word_count, chunks_str, messages_str, timestamp, count, expiry_hours, workspace_id = row
        return {
            "id": sid,
            "pdf": pdf_name,
            "pdf_pages": pdf_pages,
            "word_count": word_count,
            "chunks": json.loads(chunks_str) if chunks_str else [],
            "messages": json.loads(messages_str) if messages_str else [],
            "timestamp": timestamp,
            "count": count,
            "expiry_hours": expiry_hours,
            "workspace_id": workspace_id
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
async def upload_pdf(
    file: UploadFile = File(...),
    ocr_engine: str = Form("tesseract"),
    ocr_apikey: str = Form("")
):
    logger.info(f"📤 Upload request received for file: {file.filename} (OCR Engine: {ocr_engine})")
    try:
        pages, page_count = load_pdf(file.file, ocr_engine, ocr_apikey)
        total_text_len = sum(len(p[0]) for p in pages)
        if total_text_len == 0:
            logger.warning(f"❌ Text extraction failed for {file.filename}")
            raise HTTPException(400, "Could not extract text from PDF. It might be empty or image-based.")
        
        chunks = chunk_text(pages)
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

# ── 3. Workspaces ──────────────────────────────────────────────────────────────
@app.get("/api/workspaces/{email}")
async def get_workspaces(email: str):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, name, email, created_at FROM workspaces WHERE email = %s ORDER BY created_at DESC", (email,))
        rows = cursor.fetchall()
        for row in rows:
            if row["created_at"]:
                row["created_at"] = row["created_at"].isoformat()
        return rows
    except Exception as e:
        logger.error(f"Failed to fetch workspaces: {e}")
        raise HTTPException(500, f"Database error: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/api/workspaces")
async def create_workspace(req: WorkspaceCreateRequest):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO workspaces (id, name, email) VALUES (%s, %s, %s)",
            (req.id, req.name, req.email)
        )
        conn.commit()
        return {"message": "Workspace created successfully", "id": req.id}
    except Exception as e:
        logger.error(f"Failed to create workspace: {e}")
        raise HTTPException(500, f"Database error: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.delete("/api/workspaces/{workspace_id}")
async def delete_workspace(workspace_id: str):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # Delete workspace
        cursor.execute("DELETE FROM workspaces WHERE id = %s", (workspace_id,))
        # Cascaded delete sessions in this workspace
        cursor.execute("DELETE FROM chat_sessions WHERE workspace_id = %s", (workspace_id,))
        conn.commit()
        return {"message": "Workspace and associated documents deleted successfully"}
    except Exception as e:
        logger.error(f"Failed to delete workspace: {e}")
        raise HTTPException(500, f"Database error: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/api/user/update")
async def update_user(req: UserUpdateRequest):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. Update Name
        cursor.execute("UPDATE users SET name = %s WHERE email = %s", (req.name, req.email))
        
        # 2. Update Password if provided
        if req.password and req.password.strip():
            cursor.execute("SELECT password FROM users WHERE email = %s", (req.email,))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(404, "User not found")
            
            current_password = row[0]
            if not req.old_password or req.old_password != current_password:
                raise HTTPException(400, "Incorrect old password. Please verify and try again.")
                
            cursor.execute("UPDATE users SET password = %s WHERE email = %s", (req.password, req.email))
            
        conn.commit()
        return {"message": "User details updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update user details: {e}")
        raise HTTPException(500, f"Database error updating user: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/api/user/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. Check if user is registered
        cursor.execute("SELECT name FROM users WHERE email = %s", (req.email,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(404, "This email address is not registered in our records.")
            
        name = row[0]
        import uuid
        
        # 2. Generate secure token
        token = uuid.uuid4().hex
        expires_at = datetime.datetime.now() + datetime.timedelta(hours=1)
        
        # 3. Save or update token in password_resets
        cursor.execute(
            "INSERT INTO password_resets (email, token, expires_at) VALUES (%s, %s, %s) "
            "ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at)",
            (req.email, token, expires_at)
        )
        conn.commit()
        
        # 4. Trigger password reset email in background
        background_tasks.add_task(send_password_reset_email, req.email, name, token)
        
        return {"message": "A password reset link has been successfully dispatched to your email."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate forgot-password token: {e}")
        raise HTTPException(500, f"Database error during password reset request: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/api/user/reset-password")
async def reset_password(req: ResetPasswordRequest, background_tasks: BackgroundTasks):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. Fetch token and expiration
        cursor.execute("SELECT token, expires_at FROM password_resets WHERE email = %s", (req.email,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(400, "No active password reset request found for this email.")
            
        stored_token, expires_at = row
        
        # 2. Verify token matches
        if req.token != stored_token:
            raise HTTPException(400, "Invalid reset token.")
            
        # 3. Verify token has not expired
        if datetime.datetime.now() > expires_at:
            raise HTTPException(400, "Reset token has expired. Please request another password reset.")
            
        # 4. Fetch user name
        cursor.execute("SELECT name FROM users WHERE email = %s", (req.email,))
        user_row = cursor.fetchone()
        if not user_row:
            raise HTTPException(404, "User not found")
        name = user_row[0]
        
        # 5. Update user password
        cursor.execute("UPDATE users SET password = %s WHERE email = %s", (req.password, req.email))
        
        # 6. Delete reset record
        cursor.execute("DELETE FROM password_resets WHERE email = %s", (req.email,))
        conn.commit()
        
        # 7. Trigger confirmation email in background
        background_tasks.add_task(send_password_reset_confirmation_email, req.email, name)
        
        return {"message": "Your password has been successfully reset. You may now login."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to reset password: {e}")
        raise HTTPException(500, f"Database error during password reset execution: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.post("/api/workspaces/chat")
async def workspace_chat(req: WorkspaceChatRequest):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT chunks FROM chat_sessions WHERE workspace_id = %s", (req.workspace_id,))
        rows = cursor.fetchall()
        
        all_chunks = []
        for row in rows:
            chunks_str = row[0]
            if chunks_str:
                try:
                    chunks_list = json.loads(chunks_str)
                    if isinstance(chunks_list, list):
                        all_chunks.extend(chunks_list)
                except Exception:
                    pass
                    
        if not all_chunks:
            raise HTTPException(400, "No documents or chat sessions found in this workspace to query.")
            
        return StreamingResponse(
            stream_llm_with_context(req.question, all_chunks, req.history),
            media_type="text/event-stream"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Workspace chat error: {e}")
        raise HTTPException(500, f"AI workspace chat failed: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

import threading
import time

def cleanup_expired_sessions_loop():
    logger.info("⏰ Starting daemon loop for cleaning up expired PDF chat sessions...")
    while True:
        try:
            conn = get_db_connection()
            if conn:
                cursor = conn.cursor()
                # Run cleanup query
                cursor.execute("""
                    DELETE FROM chat_sessions 
                    WHERE expiry_hours IS NOT NULL 
                    AND NOW() > DATE_ADD(created_at, INTERVAL expiry_hours HOUR)
                """)
                deleted = cursor.rowcount
                if deleted > 0:
                    logger.info(f"🧹 Cleaned up {deleted} expired PDF chat sessions from database.")
                conn.commit()
                cursor.close()
                conn.close()
        except Exception as e:
            logger.error(f"Expired sessions cleanup iteration failed: {e}")
        time.sleep(300) # Run every 5 minutes

@app.on_event("startup")
async def startup_event():
    cleanup_thread = threading.Thread(target=cleanup_expired_sessions_loop, daemon=True)
    cleanup_thread.start()

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    logger.info(f"🚀 Starting DocMind AI server on port {port}...")
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)