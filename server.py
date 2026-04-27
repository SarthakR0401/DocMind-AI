# server.py
import datetime
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rag import load_pdf, chunk_text
from chatbot import ask_llm_with_context

app = FastAPI()

# Allow frontend to talk to this server (Updated for Production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "DocMind Backend is Online"}

# ── 1. PDF Upload ──────────────────────────────────────────────────────────────
@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    text, page_count = load_pdf(file.file)
    if not text:
        raise HTTPException(400, "Could not extract text from PDF.")
    chunks = chunk_text(text)
    return {"chunks": chunks, "page_count": page_count, "filename": file.filename}

# ── 2. Chat ────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    question: str
    chunks: list[str]
    history: list[dict] = []

@app.post("/api/chat")
async def chat(req: ChatRequest):
    answer = ask_llm_with_context(req.question, req.chunks, req.history)
    return {"answer": answer, "ts": datetime.datetime.now().strftime("%I:%M %p")}
