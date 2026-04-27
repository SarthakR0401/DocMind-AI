# 🧠 DocMind AI — Premium PDF Q&A Assistant

An enterprise-grade, beautifully designed AI document assistant that lets you upload any PDF—including scanned images—and interact intelligently with its context. **Completely powered by Groq LPU and Next.js.**

### 🌐 Live Demo
[**Launch DocMind AI 🚀**](https://docminds-ai.vercel.app/)

---

## 🚀 Key Features

- **🧠 Intelligent OCR Fallback**: Automatically detects scanned or image-heavy PDFs and triggers the OCR.space engine to extract text seamlessly.
- **✨ Premium Glassmorphism UI**: A stunning, modern interface with floating input bars, dynamic animations, and safe-area support for mobile devices.
- **📊 Real-Time Progress**: Interactive upload states with progress bars and file size analysis so you're always in the loop.
- **🏎️ Groq-Powered Speed**: Responses generated in milliseconds using Llama 3 70B on Groq's high-performance LPUs.
- **📱 Mobile Optimized**: Refined layouts designed specifically for ergonomics—perfect for chatting with documents on the go.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, Vanilla CSS, Framer-like micro-animations
- **Backend**: Python FastAPI (High-performance async processing)
- **Authentication**: NextAuth.js (Secure Google OAuth 2.0)
- **AI Processing**: Groq (Llama 3 3.3 70B)
- **OCR Engine**: OCR.space REST API
- **Document Core**: pdfplumber for high-accuracy text extraction

---

## 🏎️ Quick Start (Locally)

### 1. Configure Secrets
Create a `.env.local` inside the `docmind/` directory:
```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-secret"
NEXTAUTH_SECRET="any-random-string"
NEXTAUTH_URL="http://localhost:3000"
```

### 2. Start the Backend
```bash
pip install -r requirements.txt
python server.py
```

### 3. Start the Frontend
```bash
cd docmind
npm install
npm run dev
```

---

## ⚠️ Important Note on Data Persistence

> [!NOTE]
> **Session Ephemerality**: To ensure maximum privacy and project performance, current chat history is stored locally in the browser session. If the page is refreshed or the user logs out, the current chat history will reset. This is intentional to ensure zero-footprint hosting for public demonstrations.

---

## ✨ Design Aesthetics
- **Floating Input**: Premium glassmorphism text area optimized for touch.
- **Safe Safe-Area**: Designed to float above mobile browser navigation bars.
- **Micro-animations**: Subtle transitions for every UI interaction to provide a premium feel.
