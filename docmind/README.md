# DocMind AI — Next.js

A production-grade Next.js conversion of the DocMind AI Streamlit app.

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Google Fonts**: Playfair Display (display) + Outfit (body) + JetBrains Mono
- **Lucide React** icons

## Project Structure

```
docmind/
├── app/
│   ├── globals.css       # Design tokens, animations, chat bubbles
│   ├── layout.tsx        # Root layout with font config & metadata
│   └── page.tsx          # Entry point — auth gate
├── components/
│   ├── LoginPage.tsx     # Split-panel login (fixed alignment)
│   ├── AppShell.tsx      # Main shell: sidebar + view router
│   ├── Sidebar.tsx       # Navigation, PDF upload, user card
│   ├── ChatView.tsx      # Full chat with empty states + input
│   └── HistoryView.tsx   # Saved sessions grid
├── tailwind.config.js
├── tsconfig.json
└── next.config.js
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Key Improvements over Streamlit

### Alignment Fixes
- Login page: proper `flex` split — left hero (52%) + right panel (48%) with `items-center justify-center`
- No more wrapping/overflow text on the left hero panel
- Right panel content fully centered vertically and horizontally

### Font Upgrade
- **Playfair Display** — elegant serif for headings/brand (replaces Instrument Serif)
- **Outfit** — modern geometric sans for body text (replaces Bricolage Grotesque)
- **JetBrains Mono** — for step numbers and code elements

### UI Enhancements
- Collapsible sidebar with icon-only collapsed state
- Resizable textarea input (auto-grows, Shift+Enter for newline)
- Suggested questions chips on document-loaded empty state
- "How it works" section on no-document empty state
- Stats cards on login hero panel
- Typing animation with 3 bouncing dots
- Smooth page transitions (`page-enter` animation)
- Toast notifications for save actions
- Delete button on history cards

### Performance
- No Streamlit re-runs — instant React state updates
- Scroll-to-bottom on new messages with `scrollIntoView`
- CSS animations are GPU-accelerated (transform/opacity only)

## Backend Integration

Replace the simulated handlers in:
- `components/Sidebar.tsx` → `handleFile()` → call your PDF parsing API
- `components/ChatView.tsx` → `handleSubmit()` → call your LLM/Groq endpoint

```typescript
// Example API call in ChatView.tsx
const res = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ question: q, chunks }),
})
const { answer } = await res.json()
```

## Google Auth

Replace the simulated login in `app/page.tsx` with NextAuth.js:

```bash
npm install next-auth
```

Then configure Google OAuth in `app/api/auth/[...nextauth]/route.ts`.
