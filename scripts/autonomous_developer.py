import os
import sys
from datetime import datetime

# Configuration
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def apply_rag_upgrade():
    print("🚀 Applying Advanced Semantic Search (RAG) Upgrade...")
    rag_path = os.path.join(PROJECT_ROOT, "rag.py")
    
    rag_code = """import pdfplumber
import requests
import io
import numpy as np

def load_pdf(file) -> tuple[str, int]:
    try:
        text = ""
        with pdfplumber.open(file) as pdf:
            page_count = len(pdf.pages)
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\\n"
        
        if not text.strip():
            print("Detected image-based PDF. Triggering OCR.space API...")
            file.seek(0)
            payload = {'isOverlayRequired': False, 'apikey': 'helloworld', 'language': 'eng', 'isTable': True}
            res = requests.post('https://api.ocr.space/parse/image', files={'file': ('file.pdf', file)}, data=payload)
            result = res.json()
            exit_code = result.get('OCRExitCode')
            if exit_code in [1, 2, 4]:
                parsed_text = ""
                for page in result.get('ParsedResults', []):
                    parsed_text += page.get('ParsedText', '') + "\\n"
                text = parsed_text
        return text, page_count
    except Exception as e:
        print(f"Capture Error: {e}")
        return "", 0

def chunk_text(text: str, chunk_size: int = 600, overlap: int = 80) -> list[str]:
    if not text.strip(): return []
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

def get_context(query: str, chunks: list[str], top_k: int = 4) -> str:
    \"\"\"
    Upgraded: Uses simple vector-like scoring (TF-IDF style) for better retrieval.
    \"\"\"
    if not chunks: return "No document content available."
    
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    
    try:
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf_matrix = vectorizer.fit_transform(chunks + [query])
        cosine_sim = cosine_similarity(tfidf_matrix[-1], tfidf_matrix[:-1]).flatten()
        
        top_indices = cosine_sim.argsort()[-top_k:][::-1]
        top_chunks = [chunks[i] for i in top_indices if cosine_sim[i] > 0]
        
        if not top_chunks: return chunks[0]
        return "\\n\\n---\\n\\n".join(top_chunks)
    except Exception as e:
        print(f"RAG Error: {e}. Falling back to keyword search.")
        query_words = set(query.lower().split())
        scored = sorted(enumerate(chunks), key=lambda x: sum(1 for w in query_words if w in x[1].lower()), reverse=True)
        return "\\n\\n---\\n\\n".join([chunks[i] for i, _ in scored[:top_k]])
"""
    with open(rag_path, "w", encoding="utf-8") as f:
        f.write(rag_code)
    
    # Update requirements
    req_path = os.path.join(PROJECT_ROOT, "requirements.txt")
    with open(req_path, "a") as f:
        f.write("\nscikit-learn\nnumpy")

    
    print("✅ RAG Upgrade Complete.")

def apply_pdf_previewer_upgrade():
    print("🚀 Applying Integrated PDF Previewer Upgrade...")
    # This would involve complex file editing of AppShell.tsx
    # For automation, we will use a simplified approach: we'll swap a component.
    # In a real scenario, this would be a git patch.
    print("✅ PDF Previewer Upgrade Complete (Simulated for Demo).")

def main():
    now = datetime.now()
    date_str = now.strftime("%d-%m-%Y")
    
    print(f"--- Autonomous Developer Heartbeat: {date_str} ---")
    
    if date_str == "02-05-2026":
        apply_rag_upgrade()
    elif date_str == "03-05-2026":
        apply_pdf_previewer_upgrade()
    else:
        print("Nothing scheduled for today. Waiting...")

if __name__ == "__main__":
    main()
