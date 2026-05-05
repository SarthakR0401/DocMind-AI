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
from rag import load_pdf, chunk_text
from chatbot import stream_llm_with_context

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DocMind")

app = FastAPI(title="DocMind AI Backend")

# MongoDB Configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
try:
    client = MongoClient(MONGO_URI)
    db = client["docmind_db"]
    users_col = db["users"]
    # Check connection
    client.admin.command('ping')
    logger.info("Successfully connected to MongoDB")
except Exception as e:
    logger.error(f"Could not connect to MongoDB: {e}")

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
    
    # Upsert logic to support profile completion
    users_col.update_one(
        {"email": req.email},
        {"$set": {"password": req.password, "name": req.name}},
        upsert=True
    )
    return {"message": "Account created/updated successfully"}

@app.post("/api/auth/login")
async def login(req: AuthRequest):
    user = users_col.find_one({"email": req.email})
    if not user or user["password"] != req.password:
        raise HTTPException(401, "Invalid credentials")
    
    return {"message": "Login successful", "user": {"email": req.email, "name": user["name"]}}

@app.get("/api/auth/status/{email}")
async def get_status(email: str):
    user = users_col.find_one({"email": email})
    return {"registered": user is not None}


# Allow frontend to talk to this server (Updated for Production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    history: list[dict] = []

@app.post("/api/chat")
async def chat(req: ChatRequest):
    logger.info(f"💬 Chat request: {req.question[:50]}...")
    try:
        return StreamingResponse(
            stream_llm_with_context(req.question, req.chunks, req.history),
            media_type="text/plain"
        )
    except Exception as e:
        logger.error(f"🚨 Chat error: {str(e)}")
        raise HTTPException(500, f"AI logic failed: {str(e)}")
