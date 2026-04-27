import os
import time
import groq as groq_sdk
from rag import get_context
from dotenv import load_dotenv

load_dotenv()

# Use the key from the environment variable if possible, otherwise use the previous hardcoded key
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "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")

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
    """
    if history is None:
        history = []

    # Retrieve the most relevant chunks from the document
    context = get_context(user_input, chunks)

    system_prompt = (
        "You are DocMind, a helpful and precise AI customer-support assistant. "
        "Your primary job is to answer questions strictly based on the uploaded PDF document. "
        "When the user mentions 'file', 'document', 'pdf', or 'paper', they are referring to the specific uploaded PDF context. "
        "Treat all these terms as identical and only provide responses derived from the provided context. "
        "If the answer is not in the context, clearly state that you don't know based on the provided information. "
        "Be concise, professional, and use clear formatting like bullet points.\n\n"
        f"--- DOCUMENT CONTEXT ---\n{context}\n--- END CONTEXT ---"
    )

    # Build messages: system + history + current question
    messages = [{"role": "system", "content": system_prompt}]
    for turn in history:
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": user_input})

    # Auto-retry on 429 rate-limit errors
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