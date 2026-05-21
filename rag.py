import fitz  # PyMuPDF
import requests
import io
import os
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Configure a requests session with retries for robust API calls
http_session = requests.Session()
retries = Retry(
    total=3,
    backoff_factor=0.5,
    status_forcelist=[500, 502, 503, 504],
    allowed_methods=["POST"]
)
adapter = HTTPAdapter(max_retries=retries)
http_session.mount("https://", adapter)
http_session.mount("http://", adapter)

# Hugging Face Configuration
HF_TOKEN = os.getenv("HF_TOKEN")
# Using a robust, small semantic model
HF_API_URL = "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2"

# Simple local cache for embeddings to save API calls
_embedding_cache = {}

def get_huggingface_embeddings(texts: list[str]) -> list[list[float]] | None:
    if not HF_TOKEN:
        return None
    
    # Check cache for each text
    results = []
    missing_texts = []
    text_to_idx = {}
    
    for i, text in enumerate(texts):
        if text in _embedding_cache:
            results.append(_embedding_cache[text])
        else:
            results.append(None)
            text_to_idx[len(missing_texts)] = i
            missing_texts.append(text)
    
    if not missing_texts:
        return results

    try:
        headers = {"Authorization": f"Bearer {HF_TOKEN}"}
        # The API can handle multiple inputs. Using session with retries.
        response = http_session.post(HF_API_URL, headers=headers, json={"inputs": missing_texts}, timeout=15)
        
        if response.status_code == 200:
            embeddings = response.json()
            # If the API returned a list of lists
            if isinstance(embeddings, list) and len(embeddings) > 0:
                for i, emb in enumerate(embeddings):
                    original_idx = text_to_idx[i]
                    results[original_idx] = emb
                    _embedding_cache[missing_texts[i]] = emb
                return results
        
        print(f"HF API Error: {response.status_code} {response.text}")
        return None
    except Exception as e:
        print(f"HF Connection Error: {e}")
        return None

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
                res = http_session.post('https://api.ocr.space/parse/image', files={'filename': ('page.png', img_bytes)}, data=payload, timeout=15)
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
    Hybrid Search: Uses Hugging Face Semantic Embeddings with TF-IDF fallback.
    """
    if not chunks: return "No document content available."

    # 1. Try Semantic Search via Hugging Face
    hf_embeddings = get_huggingface_embeddings(chunks + [query])
    if hf_embeddings and all(e is not None for e in hf_embeddings):
        try:
            chunk_vectors = np.array(hf_embeddings[:-1])
            query_vector = np.array(hf_embeddings[-1]).reshape(1, -1)
            
            # Use sklearn's cosine_similarity
            similarities = cosine_similarity(query_vector, chunk_vectors).flatten()
            top_indices = similarities.argsort()[-top_k:][::-1]
            
            top_chunks = [chunks[i] for i in top_indices if similarities[i] > 0.1]
            if top_chunks:
                return "\n\n---\n\n".join(top_chunks)
        except Exception as e:
            print(f"Semantic search processing failed: {e}")

    # 2. Fallback to Lightweight TF-IDF (Render-safe)
    try:
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf_matrix = vectorizer.fit_transform(chunks)
        query_vec = vectorizer.transform([query])
        
        similarities = cosine_similarity(query_vec, tfidf_matrix).flatten()
        top_indices = similarities.argsort()[-top_k:][::-1]
        
        top_chunks = [chunks[i] for i in top_indices if similarities[i] > 0]
        
        if not top_chunks: return chunks[0]
        return "\n\n---\n\n".join(top_chunks)
    except Exception as e:
        print(f"Search Fallback Error: {e}")
        return chunks[0]
