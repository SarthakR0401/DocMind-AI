import datetime
import logging
import re
import json
import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from pymongo import MongoClient
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

# MongoDB Configuration
# Explicitly adding tls=true and other params for cloud compatibility
MONGO_URI = "mongodb+srv://sarthakrathi04_db_user:Sarthak%4004@docmindai.yl74upm.mongodb.net/?retryWrites=true&w=majority&tls=true&tlsAllowInvalidCertificates=true"
try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
    db = client["docmind_db"]
    users_col = db["users"]
    logger.info("MongoDB Client initialized with Atlas URI")
except Exception as e:
    logger.error(f"Could not initialize MongoDB Client: {e}")

def is_valid_email(email):
    return re.match(r"[^@]+@[^@]+\.[^@]+", email)

class AuthRequest(BaseModel):
    email: str
    password: str
    name: str = "User"

@app.post("/api/auth/signup")
async def signup(req: AuthRequest):
    if not is_valid_email(req.email):
        raise HTTPException(400, "Invalid email format")
    
    try:
        # Upsert logic to support profile completion
        users_col.update_one(
            {"email": req.email},
            {"$set": {"password": req.password, "name": req.name}},
            upsert=True
        )
        return {"message": "Account created/updated successfully"}
    except Exception as e:
        logger.error(f"Signup failed: {e}")
        raise HTTPException(500, f"Database error during signup: {e}")

@app.post("/api/auth/login")
async def login(req: AuthRequest):
    try:
        user = users_col.find_one({"email": req.email})
        if not user or user["password"] != req.password:
            raise HTTPException(401, "Invalid credentials")
        return {"message": "Login successful", "user": {"email": req.email, "name": user["name"]}}
    except Exception as e:
        logger.error(f"Login failed: {e}")
        raise HTTPException(500, f"Database error during login: {e}")

@app.get("/api/auth/status/{email}")
async def get_status(email: str):
    try:
        user = users_col.find_one({"email": email})
        return {"registered": user is not None}
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return {"registered": False, "error": str(e)}

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