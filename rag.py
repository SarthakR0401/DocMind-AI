import fitz  # PyMuPDF
import requests
import io
import numpy as np

def load_pdf(file) -> tuple[str, int]:
    try:
        text = ""
        # Read file bytes for fitz
        file_bytes = file.read()
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        page_count = len(doc)
        
        for page in doc:
            text += page.get_text() + "\n"
        
        doc.close()
        
        if not text.strip():
            print("Detected image-based PDF. Triggering OCR.space API...")
            # Seek back to 0 if needed, but we already read bytes. 
            # Re-creating a BytesIO for the OCR request.
            file_stream = io.BytesIO(file_bytes)
            payload = {'isOverlayRequired': False, 'apikey': 'helloworld', 'language': 'eng', 'isTable': True}
            res = requests.post('https://api.ocr.space/parse/image', files={'file': ('file.pdf', file_stream)}, data=payload)
            result = res.json()
            exit_code = result.get('OCRExitCode')
            if exit_code in [1, 2, 4]:
                parsed_text = ""
                for page in result.get('ParsedResults', []):
                    parsed_text += page.get('ParsedText', '') + "\n"
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
    """
    Upgraded: Uses simple vector-like scoring (TF-IDF style) for better retrieval.
    """
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
        return "\n\n---\n\n".join(top_chunks)
    except Exception as e:
        print(f"RAG Error: {e}. Falling back to keyword search.")
        query_words = set(query.lower().split())
        scored = sorted(enumerate(chunks), key=lambda x: sum(1 for w in query_words if w in x[1].lower()), reverse=True)
        return "\n\n---\n\n".join([chunks[i] for i, _ in scored[:top_k]])
