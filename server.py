# server.py
import datetime
import logging
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rag import load_pdf, chunk_text
from chatbot import ask_llm_with_context

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DocMind")

app = FastAPI(title="DocMind AI Backend")

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
        answer = ask_llm_with_context(req.question, req.chunks, req.history)
        return {"answer": answer, "ts": datetime.datetime.now().strftime("%I:%M %p")}
    except Exception as e:
        logger.error(f"🚨 Chat error: {str(e)}")
        raise HTTPException(500, f"AI logic failed: {str(e)}")
