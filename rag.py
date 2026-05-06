import fitz  # PyMuPDF
import requests
import io
import numpy as np

def load_pdf(file_obj) -> tuple[str, int]:
    try:
        if isinstance(file_obj, bytes):
            file_obj = io.BytesIO(file_obj)
        elif hasattr(file_obj, "read"):
            file_obj = io.BytesIO(file_obj.read())

        doc = fitz.open(stream=file_obj, filetype="pdf")
        full_text = ""
        for page in doc:
            text = page.get_text()
            if not text.strip():
                pix = page.get_pixmap()
                img_bytes = pix.tobytes("png")
                payload = {'apikey': 'helloworld', 'language': 'eng'}
                res = requests.post('https://api.ocr.space/parse/image', files={'filename': ('page.png', img_bytes)}, data=payload)
                result = res.json()
                if result.get('ParsedResults'):
                    text = result['ParsedResults'][0].get('ParsedText', '')
            full_text += text + "\n"
        
        page_count = len(doc)
        doc.close()
        return full_text, page_count
    except Exception as e:
        print(f"Capture Error: {e}")
        return "", 0

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 150) -> list[str]:
    if not text.strip(): return []
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

def get_context(query: str, chunks: list[str], top_k: int = 5) -> str:
    """
    Advanced Semantic Search: Uses sentence-transformers for dense vector retrieval.
    """
    if not chunks: return "No document content available."
    try:
        from sentence_transformers import SentenceTransformer
        from sklearn.metrics.pairwise import cosine_similarity
        model = SentenceTransformer('all-MiniLM-L6-v2')
        chunk_embeddings = model.encode(chunks)
        query_embedding = model.encode([query])
        similarities = cosine_similarity(query_embedding, chunk_embeddings).flatten()
        top_indices = similarities.argsort()[-top_k:][::-1]
        top_chunks = [chunks[i] for i in top_indices if similarities[i] > 0.1]
        if not top_chunks: return chunks[0]
        return "\n\n---\n\n".join(top_chunks)
    except Exception as e:
        print(f"Semantic Search Error: {e}")
        return chunks[0]
