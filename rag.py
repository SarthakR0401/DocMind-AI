import pdfplumber
import requests
import io

def load_pdf(file) -> tuple[str, int]:
    """
    Extract text from a PDF. If it's a scan (no text), it uses OCR.space API as a fallback.
    """
    try:
        text = ""
        # 1. Try standard extraction first (fast & free)
        with pdfplumber.open(file) as pdf:
            page_count = len(pdf.pages)
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        
            # 2. If text is empty, it's likely a scan. Use OCR Fallback.
        if not text.strip():
            print("Detected image-based PDF. Triggering OCR.space API...")
            file.seek(0)
            payload = {
                'isOverlayRequired': False,
                'apikey': 'helloworld',
                'language': 'eng',
                'isTable': True,
            }
            res = requests.post('https://api.ocr.space/parse/image',
                             files={'filename': ('file.pdf', file)},
                             data=payload)
            result = res.json()
            
            # DEBUG: Print the actual API result to the Render logs
            print(f"OCR API Result: {result}")
            
            if result.get('OCRExitCode') == 1:
                parsed_text = ""
                for page in result.get('ParsedResults', []):
                    parsed_text += page.get('ParsedText', '') + "\n"
                text = parsed_text
                print(f"OCR Success! Extracted {len(text)} characters.")
            else:
                error_msg = result.get('ErrorMessage', 'Unknown API Error')
                print(f"OCR Failed: {error_msg}")

        return text, page_count
    except Exception as e:
        print(f"Capture Error: {e}")
        return "", 0


def chunk_text(text: str, chunk_size: int = 600, overlap: int = 80) -> list[str]:
    """
    Split text into overlapping chunks so context is never lost at boundaries.
    """
    if not text.strip():
        return []

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap

    return chunks


def get_context(query: str, chunks: list[str], top_k: int = 3) -> str:
    """
    Retrieve the most relevant chunks for a query using keyword scoring.
    """
    if not chunks:
        return "No document content available."

    query_words = set(query.lower().split())

    def score(chunk: str) -> int:
        chunk_lower = chunk.lower()
        return sum(1 for w in query_words if w in chunk_lower)

    scored = sorted(enumerate(chunks), key=lambda x: score(x[1]), reverse=True)
    top_chunks = [chunks[i] for i, _ in scored[:top_k] if score(chunks[i]) > 0]

    if not top_chunks:
        top_chunks = [chunks[0]]

    return "\n\n---\n\n".join(top_chunks)