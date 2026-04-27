import time
import groq as groq_sdk
from rag import get_context

# ── Groq setup ────────────────────────────────────────────────────────────────
# FREE API — no credit card, no quota issues!
# Get your key at: https://console.groq.com  (sign up → API Keys → Create)
GROQ_API_KEY = "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"   # ← paste your Groq key here

_client = groq_sdk.Groq(api_key=GROQ_API_KEY)

# Best free model: fast, smart, 14,400 req/day
MODEL = "llama-3.3-70b-versatile"


def ask_llm_with_context(
    user_input: str,
    chunks: list[str],
    history: list[dict] | None = None,
    retries: int = 3,
) -> str:
    """
    Answer a user question using RAG-retrieved document context via Groq.

    Parameters
    ----------
    user_input : str   — the current user question
    chunks     : list  — all text chunks from the uploaded PDF
    history    : list  — previous turns [{"role": "user"|"assistant", "content": str}]
    retries    : int   — auto-retry on rate-limit (429) errors

    Returns
    -------
    str — the assistant's answer
    """
    if history is None:
        history = []

    # Retrieve the most relevant chunks from the document
    context = get_context(user_input, chunks)

    system_prompt = (
        "You are DocMind, a helpful and precise AI customer-support assistant. "
        "You answer questions strictly based on the document context provided. "
        "If the answer cannot be found in the context, say so clearly — do not make things up. "
        "Be concise, friendly, and structured. Use bullet points when listing multiple items.\n\n"
        f"--- DOCUMENT CONTEXT ---\n{context}\n--- END CONTEXT ---"
    )

    # Build messages: system + history + current question
    messages = [{"role": "system", "content": system_prompt}]
    for turn in history:
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": user_input})

    # ── Auto-retry on 429 rate-limit errors ───────────────────────────────────
    for attempt in range(retries):
        try:
            response = _client.chat.completions.create(
                model=MODEL,
                messages=messages,
                max_tokens=1024,
                temperature=0.3,
            )
            return response.choices[0].message.content

        except groq_sdk.RateLimitError as e:
            # Extract retry-after from error if available, else use backoff
            wait = 10 * (attempt + 1)
            if attempt < retries - 1:
                time.sleep(wait)
            else:
                return (
                    f"⚠️ Rate limit reached. Please wait a moment and try again.\n"
                    f"_(Groq free tier: resets every minute)_"
                )

        except groq_sdk.APIError as e:
            return f"⚠️ API error: {str(e)}"