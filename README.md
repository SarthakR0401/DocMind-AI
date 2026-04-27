# 🧠 DocMind AI — PDF Q&A Assistant

An AI-powered customer support assistant that lets you upload any PDF and ask questions about it. **Completely free — no credit card needed.**

---

## 🆓 Why Gemini? (Free Tier Comparison)

| Provider | Free Requests/Day | Credit Card | Expires? |
|----------|-------------------|-------------|----------|
| **Google Gemini** | **1,500** | ❌ Not needed | ❌ Never |
| Anthropic Claude | Trial credits only | ✅ Required | ✅ Yes |
| OpenAI | Trial credits only | ✅ Required | ✅ Yes (3 months) |

---

## 🚀 Quick Start

### Step 1 — Get Your FREE Gemini API Key (30 seconds)
1. Go to **https://aistudio.google.com/app/apikey**
2. Sign in with any Google account
3. Click **"Create API Key"** — copy it (starts with `AIza...`)

### Step 2 — Install
```bash
pip install -r requirements.txt
```

### Step 3 — Run
```bash
streamlit run app.py
```

### Step 4 — Paste your key in the sidebar and upload a PDF!

---

## 📁 Optional: Environment Variable
```bash
export GEMINI_API_KEY="AIza..."
```

---

## 🏗️ Architecture
```
app.py       ← Streamlit dark-theme UI with in-sidebar API key input
rag.py       ← PDF loading, overlapping chunking, keyword retrieval
chatbot.py   ← Gemini 2.0 Flash with multi-turn chat history
```

---

## 🐛 All 9 Bugs Fixed

| # | Bug | Fix |
|---|-----|-----|
| 1 | `load_pdf()` called outside `if uploaded_file:` — crash on load | Moved inside session-state guard |
| 2 | No session state — PDF re-parsed every keystroke | `st.session_state` caching |
| 3 | Used `distilgpt2` — incoherent answers | Replaced with Gemini 2.0 Flash (free) |
| 4 | `chat_history` never used — no memory | Full multi-turn history passed to Gemini |
| 5 | `get_context()` only 1 chunk via literal match | Top-3 keyword-scored chunks returned |
| 6 | No chunk overlap — context lost at boundaries | 80-char overlap added |
| 7 | `load_pdf()` returned no page count | Returns `(text, page_count)` tuple |
| 8 | Wrong requirements (openai, faiss-cpu unused) | Cleaned to actual dependencies |
| 9 | Plain unstyled UI | Full dark glassmorphism chat interface |

---

## 📊 Gemini Free Limits
- **1,500 requests/day** — plenty for personal use
- **1M tokens/minute** — no bottlenecks
- **No expiry** — permanent free tier
- **No credit card ever**
