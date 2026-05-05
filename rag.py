import fitz  # PyMuPDF
import requests
import io
import numpy as np

def load_pdf(file_obj) -> tuple[str, int]:
    try:
        # If it's bytes, wrap in io.BytesIO
        if isinstance(file_obj, bytes):
            file_obj = io.BytesIO(file_obj)
        elif hasattr(file_obj, "read"):
            file_obj = io.BytesIO(file_obj.read())

        doc = fitz.open(stream=file_obj, filetype="pdf")
        full_text = ""
        for page in doc:
            text = page.get_text()
            # If no digital text, use Cloud OCR
            if not text.strip():
                pix = page.get_pixmap()
                img_bytes = pix.tobytes("png")
                
                # Call OCR.space Free API
                payload = {
                    'apikey': 'helloworld', # Free API Key
                    'language': 'eng',
                }
                res = requests.post(
                    'https://api.ocr.space/parse/image',
                    files={'filename': ('page.png', img_bytes)},
                    data=payload
                )
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

def get_context(query: str, chunks: list[str], top_k: int = 8) -> str:
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
