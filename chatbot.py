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
        "You are DocMind, a helpful and precise AI customer-support assistant. "
        "Your primary job is to answer questions strictly based on the uploaded PDF document. "
        "When the user mentions 'file', 'document', 'pdf', or 'paper', they are referring to the specific uploaded PDF context. "
        "Treat all these terms as identical and only provide responses derived from the provided context. "
        "If the answer is not in the context, clearly state that you don't know based on the provided information. "
        "Be concise, professional, and use clear formatting like bullet points.\n\n"
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