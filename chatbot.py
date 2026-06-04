import os
import time
import groq as groq_sdk
from rag import get_context
from dotenv import load_dotenv

# Load environment variables from .env file (force override to use new key)
load_dotenv(override=True)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

if not GROQ_API_KEY:
    # Fallback to a warning message instead of a broken key
    print("WARNING: GROQ_API_KEY not found in environment variables.")
    _client = groq_sdk.Groq(api_key="DUMMY_KEY")
else:
    _client = groq_sdk.Groq(api_key=GROQ_API_KEY)

# Best free model: fast, smart, 14,400 req/day
MODEL = "llama-3.3-70b-versatile"


def stream_llm_with_context(
    user_input: str,
    chunks: list[str],
    history: list[dict] | None = None,
):
    """
    Generator that yields chunks of the AI response in real-time.
    """
    if history is None:
        history = []

    context = get_context(user_input, chunks)

    system_prompt = (
        "You are DocMind, an advanced AI document assistant. Your goal is to provide comprehensive, accurate, and detailed answers "
        "strictly based on the uploaded PDF document content provided below. "
        "When the user mentions 'file', 'document', 'pdf', or 'paper', they are referring to the specific uploaded PDF context. "
        "If a question requires a detailed explanation, provide it. Use clear formatting, headings, and bullet points to organize your response. "
        "Do not be overly brief; ensure you cover all relevant points from the context. "
        "If the answer is not in the context, state that you cannot find the information in the provided document.\n\n"
        f"--- DOCUMENT CONTEXT ---\n{context}\n--- END CONTEXT ---"
    )

    messages = [{"role": "system", "content": system_prompt}]
    for turn in history:
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": user_input})

    try:
        completion = _client.chat.completions.create(
            model=MODEL,
            messages=messages,
            max_tokens=1024,
            temperature=0.3,
            stream=True,
        )
        for chunk in completion:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    except Exception as e:
        yield f"⚠️ Error: {str(e)}"