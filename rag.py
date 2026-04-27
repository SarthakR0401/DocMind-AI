from PyPDF2 import PdfReader


def load_pdf(file) -> tuple[str, int]:
    """
    Extract text from a PDF file.
    Returns (full_text, page_count).
    Always returns a valid tuple — never raises to the caller.
    """
    try:
        reader = PdfReader(file)
        page_count = len(reader.pages)
        text = ""
        for page in reader.pages:
            try:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
            except Exception:
                continue   # skip unreadable pages, keep going

        return text, page_count

    except Exception as e:
        # Return safe defaults so the caller never gets an unpack error
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