# GitHub + VS Code Setup Guide

## Step 1 — Install Git
Download from https://git-scm.com/download/win → install with all defaults.
Restart VS Code after installing.

## Step 2 — Create GitHub Repo
1. Go to https://github.com/new
2. Name: `docmind-ai`
3. Set to **Private** ← important, your Groq key is in the code
4. Do NOT tick "Add README"
5. Click **Create repository**

## Step 3 — Create .gitignore
Create `.gitignore` in your project root:
```
__pycache__/
*.pyc
*.pyo
.env
.streamlit/secrets.toml
Thumbs.db
.DS_Store
```

## Step 4 — First Push (VS Code Terminal → Ctrl+`)
```bash
cd D:\genai-support-assistant
git init
git add .
git commit -m "feat: initial DocMind AI with Google OAuth"
git remote add origin https://github.com/YOUR_USERNAME/docmind-ai.git
git branch -M main
git push -u origin main
```

## Step 5 — Commit after every change
```bash
git add .
git commit -m "feat: add chat history with continue"
git push
```

Or use VS Code's Source Control panel (branch icon in left sidebar):
1. Click **+** next to changed files to stage
2. Type commit message
3. Click **✓ Commit** → then **Sync Changes**

## Commit Message Guide
| Prefix | When to use |
|--------|-------------|
| `feat:` | New feature added |
| `fix:` | Bug fixed |
| `ui:` | Visual/style change |
| `refactor:` | Code restructured |
| `docs:` | Only docs/README changed |
| `chore:` | Dependency or config update |

## Recommended VS Code Extensions
Install from Extensions panel (Ctrl+Shift+X):
- **GitLens** — line-by-line git history
- **Git Graph** — visual commit tree
- **Python** — syntax + IntelliSense
- **Pylance** — type checking

## ⚠️ Security reminder
- `secrets.toml` → in `.gitignore`, never committed
- `GROQ_API_KEY` in `chatbot.py` → move to `.env` before making repo public:
  ```python
  # chatbot.py
  from dotenv import load_dotenv, find_dotenv
  import os
  load_dotenv(find_dotenv())
  GROQ_API_KEY = os.getenv("GROQ_API_KEY")
  ```
  Install: `pip install python-dotenv`
  Create `.env`:
  ```
  GROQ_API_KEY=gsk_...
  ```