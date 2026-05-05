# 🧠 DocMind AI — Premium PDF Q&A Assistant

An enterprise-grade, beautifully designed AI document assistant that lets you upload any PDF—including scanned images—and interact intelligently with its context. **Completely powered by Groq LPU and Next.js.**

### 🌐 Live Demo
[**Launch DocMind AI 🚀**](https://docminds-ai.vercel.app/)

---

## 🚀 Key Features

- **🌓 Dark & Light Mode**: A beautiful, theme-aware UI that switches instantly with a dedicated toggle and persists your preference.
- **📄 Integrated PDF Previewer**: A dual-pane interface (desktop) and a responsive full-screen toggle (mobile) that lets you view your document while you chat.
- **🏎️ Ultra-Fast Extraction**: Replaced `pdfplumber` with **PyMuPDF**, resulting in 10x faster document processing and instant uploads.
- **🧠 Advanced RAG Accuracy**: Optimized retrieval with larger context chunks and higher retrieval counts for detailed, comprehensive AI answers.
- **🔐 Enhanced Authentication**: Support for both secure **Google OAuth 2.0** and traditional **Email/Password** credentials with a customized onboarding flow.
- **✨ Premium Glassmorphism UI**: A stunning, modern interface with floating input bars, dynamic animations, and safe-area support for mobile devices.
- **🏎️ Groq-Powered Speed**: Responses generated in milliseconds using **Llama 3.3 70B** on Groq's high-performance LPUs.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, Vanilla CSS, Framer-like micro-animations
- **Backend**: Python FastAPI (High-performance async processing)
- **Authentication**: NextAuth.js & Custom Backend Auth (Signup/Login)
- **AI Processing**: Groq (Llama 3.3 70B)
- **PDF Core**: **PyMuPDF (fitz)** for lightning-fast text extraction
- **OCR Engine**: OCR.space REST API

---

## 🏎️ Quick Start (Locally)

### 1. Configure Secrets
Create a `.env.local` inside the `docmind/` directory:
```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-secret"
NEXTAUTH_SECRET="any-random-string"
NEXTAUTH_URL="https://docminds-ai.vercel.app/"
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
> **Session Persistence**: Chat history is stored per-session. However, with the new **Advanced Authentication**, users can now create personal accounts (Email/Password) to manage their profiles and link their Google accounts for a more personalized experience.

---

## ✨ Design Aesthetics
- **🌓 Theme Toggle**: Seamless transition between light and dark modes with persisted preference.
- **Floating Input**: Premium glassmorphism text area optimized for touch.
- **Safe Safe-Area**: Designed to float above mobile browser navigation bars.
- **Micro-animations**: Subtle transitions for every UI interaction to provide a premium feel.
