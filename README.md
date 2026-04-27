# 🧠 DocMind AI — PDF Q&A Assistant

An enterprise-grade, beautifully designed AI document assistant that lets you upload any PDF and interact intelligently with its context. **Completely powered by Groq LPU and Next.js.**

---

## 🚀 Tech Stack

- **Frontend**: Next.js 14, Tailwind CSS, React Markdown, Framer-like animations
- **Backend**: Python FastAPI
- **Authentication**: NextAuth.js (Google OAuth 2.0)
- **AI Processing**: Groq (Llama 3 70B Versatile)
- **Document Processing**: PyPDF2 + custom overlapping semantic chunker

---

## 🏎️ Quick Start

### 1. Configure Secrets

Create a `.env.local` inside the `docmind/` directory with your Google OAuth and NextAuth secrets:
```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-secret"
NEXTAUTH_SECRET="any-random-string"
NEXTAUTH_URL="http://localhost:3000"
```

Create a `.env` in the root directory for your Groq AI capabilities:
```env
GROQ_API_KEY="gsk_..."
```

### 2. Start the Backend
```bash
pip install -r requirements.txt
uvicorn server:app --reload
```
*API runs on `http://localhost:8000`.*

### 3. Start the Frontend
```bash
cd docmind
npm install
npm run dev
```
*App runs on `http://localhost:3000`.*

---

## ✨ Features

- **Semantic Q&A**: Uses localized document chunking so the AI isolates its context heavily into your PDF.
- **Glassmorphism UI**: Beautiful, modern layout built natively with Tailwind CSS and CSS-only animations.
- **Markdown Renders**: Real-time markdown parser renders AI output logically with bold formats, syntax-highlighted code blocks, and structured lists.
- **Secure Access**: Native Google OAuth boundary intercepts traffic dynamically inside Next.js layout structures.
