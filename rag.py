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
    connect=0,  # Do not retry on connection/DNS failures to avoid noisy logs and delays
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

# Check if Hugging Face API is reachable at startup
_hf_api_available = True
if HF_TOKEN:
    try:
        # Quick check with a short timeout to see if host is reachable
        r = requests.head("https://api-inference.huggingface.co", timeout=1.5)
    except Exception:
        print("Hugging Face API is unreachable. Disabling semantic search and falling back to TF-IDF.")
        _hf_api_available = False

def get_huggingface_embeddings(texts: list[str]) -> list[list[float]] | None:
    global _hf_api_available
    if not _hf_api_available:
        return None
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
        response = http_session.post(HF_API_URL, headers=headers, json={"inputs": missing_texts}, timeout=(2.5, 15))
        
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
        if response.status_code in [400, 401, 403, 404]:
            print("Disabling future Hugging Face API embedding requests due to persistent API error.")
            _hf_api_available = False
        return None
    except Exception as e:
        print(f"HF Connection Error: {e}")
        print("Disabling future Hugging Face API embedding requests due to connection/resolution failure.")
        _hf_api_available = False
        return None

def extract_ocr_from_page(fitz_page, page_num: int, ocr_engine: str = "tesseract", ocr_apikey: str = "") -> str:
    """Try selected OCR engine first, then fall back."""
    # 1. Try local pytesseract OCR if selected
    if ocr_engine == "tesseract":
        try:
            import pytesseract
            from PIL import Image
            pix = fitz_page.get_pixmap()
            img_bytes = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_bytes))
            text = pytesseract.image_to_string(img)
            if text.strip():
                print(f"OCR: Successfully extracted text locally for page {page_num} using pytesseract.")
                return text
        except Exception:
            pass

    # 2. Try ocr.space API
    try:
        api_key = ocr_apikey if ocr_apikey.strip() else os.getenv("OCR_SPACE_API_KEY", "helloworld")
        pix = fitz_page.get_pixmap()
        img_bytes = pix.tobytes("png")
        payload = {'apikey': api_key, 'language': 'eng'}
        res = http_session.post('https://api.ocr.space/parse/image', files={'filename': ('page.png', img_bytes)}, data=payload, timeout=15)
        result = res.json()
        if result.get('ParsedResults'):
            text = result['ParsedResults'][0].get('ParsedText', '')
            if text.strip():
                print(f"OCR: Successfully extracted text for page {page_num} using ocr.space.")
                return text
    except Exception as e:
        print(f"OCR: Failed to perform cloud OCR for page {page_num}: {e}")

    # Fallback to local pytesseract if cloud failed and we hadn't run it
    if ocr_engine != "tesseract":
        try:
            import pytesseract
            from PIL import Image
            pix = fitz_page.get_pixmap()
            img_bytes = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_bytes))
            text = pytesseract.image_to_string(img)
            if text.strip():
                print(f"OCR: Successfully extracted text locally for page {page_num} using pytesseract fallback.")
                return text
        except Exception:
            pass

    return ""

def load_pdf(file_obj, ocr_engine: str = "tesseract", ocr_apikey: str = "") -> tuple[list[tuple[str, int]], int]:
    pages_data = []
    page_count = 0
    try:
        # Read the file object bytes
        if isinstance(file_obj, bytes):
            file_bytes = file_obj
        elif hasattr(file_obj, "read"):
            file_bytes = file_obj.read()
        else:
            file_bytes = b""
            
        file_obj_io = io.BytesIO(file_bytes)
        
        # We still open with PyMuPDF to do OCR if pages are blank
        doc = fitz.open(stream=io.BytesIO(file_bytes), filetype="pdf")
        page_count = len(doc)
        
        # 1. Try to use pdfplumber for layout-aware parsing and table extraction
        pdfplumber_success = False
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                for idx, page in enumerate(pdf.pages):
                    page_num = idx + 1
                    page_text = page.extract_text() or ""
                    
                    # Extract tables from page
                    tables = page.extract_tables()
                    if tables:
                        for table in tables:
                            table_str = "\n[Table Start]\n"
                            for row in table:
                                table_str += " | ".join(str(cell or "").strip() for cell in row) + "\n"
                            table_str += "[Table End]\n"
                            page_text += "\n" + table_str
                    
                    # If text is empty, try OCR
                    if not page_text.strip() and idx < len(doc):
                        fitz_page = doc[idx]
                        page_text = extract_ocr_from_page(fitz_page, page_num, ocr_engine, ocr_apikey)
                        
                    pages_data.append((page_text, page_num))
            pdfplumber_success = True
        except Exception as pe:
            print(f"pdfplumber layout-aware parser failed or not installed: {pe}. Falling back to standard PyMuPDF.")
            pdfplumber_success = False
            
        # 2. Fallback to PyMuPDF if pdfplumber failed
        if not pdfplumber_success:
            pages_data = []
            for idx, page in enumerate(doc):
                page_num = idx + 1
                page_text = page.get_text()
                
                # If text is empty, try OCR
                if not page_text.strip():
                    page_text = extract_ocr_from_page(page, page_num, ocr_engine, ocr_apikey)
                    
                pages_data.append((page_text, page_num))
                
        doc.close()
        return pages_data, page_count
    except Exception as e:
        print(f"PDF Capture Error: {e}")
        return [], 0

def chunk_text(pages: list[tuple[str, int]], chunk_size: int = 1000, overlap: int = 150) -> list[str]:
    if not pages: return []
    chunks = []
    for text, page_num in pages:
        if not text.strip(): continue
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk_content = text[start:end]
            # Prepend page marker to chunk context for citations
            chunks.append(f"[Source: Page {page_num}] {chunk_content}")
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
