import datetime
import streamlit as st
from rag import load_pdf, chunk_text
from chatbot import ask_llm_with_context

# ── Page config ───────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="DocMind AI",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ── CSS ───────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');

*, *::before, *::after { box-sizing: border-box; }
html, body, [class*="css"] {
    font-family: 'Plus Jakarta Sans', sans-serif !important;
    background: #ffffff !important;
    color: #111827 !important;
}
.stApp { background: #ffffff !important; }

/* hide default sidebar */
[data-testid="collapsedControl"] { display: none !important; }
section[data-testid="stSidebar"]  { display: none !important; }

/* ── Top nav ── */
.topnav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 40px; height: 62px;
    background: #fff;
    border-bottom: 1.5px solid #f0f0f0;
    position: sticky; top: 0; z-index: 999;
}
.brand {
    font-family: 'DM Serif Display', serif;
    font-size: 1.45rem; color: #111827;
    display: flex; align-items: center; gap: 9px;
}
.brand-dot { color: #2563eb; }
.nav-right { display: flex; align-items: center; gap: 8px; }
.user-chip {
    display: inline-flex; align-items: center; gap-6px;
    background: #f0f7ff; border: 1px solid #bfdbfe;
    border-radius: 100px; padding: 5px 14px;
    font-size: 0.8rem; font-weight: 600; color: #1d4ed8;
}

/* ── Auth page ── */
.auth-page {
    min-height: 100vh; display: flex; align-items: center;
    justify-content: center; background: #f8faff;
    padding: 40px 20px;
}
.auth-card {
    background: #fff; border-radius: 28px;
    box-shadow: 0 8px 60px rgba(37,99,235,0.10);
    padding: 56px 52px; width: 100%; max-width: 460px;
    border: 1.5px solid #e0eaff; text-align: center;
}
.auth-logo {
    font-family: 'DM Serif Display', serif;
    font-size: 2.6rem; color: #111827; margin-bottom: 4px;
}
.auth-logo-dot { color: #2563eb; }
.auth-sub {
    color: #6b7280; font-size: 0.92rem; margin-bottom: 40px;
    line-height: 1.6;
}
.google-btn {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 12px; width: 100%;
    background: #fff; border: 2px solid #e5e7eb;
    border-radius: 14px; padding: 15px 24px;
    font-size: 0.95rem; font-weight: 600; color: #374151;
    cursor: pointer; transition: all 0.2s;
    font-family: 'Plus Jakarta Sans', sans-serif;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.google-btn:hover {
    border-color: #2563eb; color: #2563eb;
    box-shadow: 0 4px 20px rgba(37,99,235,0.15);
    transform: translateY(-1px);
}
.google-icon {
    width: 22px; height: 22px;
}
.auth-footer {
    margin-top: 32px; font-size: 0.76rem; color: #9ca3af; line-height: 1.7;
}

/* ── Inputs ── */
.stTextInput > label { display: none !important; }
.stTextInput > div > div > input {
    background: #f9fafb !important;
    border: 1.5px solid #e5e7eb !important;
    border-radius: 12px !important; color: #111827 !important;
    font-family: 'Plus Jakarta Sans', sans-serif !important;
    padding: 13px 16px !important; font-size: 0.94rem !important;
    transition: all 0.2s !important;
}
.stTextInput > div > div > input:focus {
    border-color: #2563eb !important;
    box-shadow: 0 0 0 4px rgba(37,99,235,0.10) !important;
    background: #fff !important;
}

/* ── Buttons ── */
.stButton > button {
    background: #2563eb !important; color: #fff !important;
    border: none !important; border-radius: 12px !important;
    font-family: 'Plus Jakarta Sans', sans-serif !important;
    font-weight: 700 !important; font-size: 0.88rem !important;
    padding: 10px 22px !important;
    transition: all 0.2s !important; letter-spacing: 0.01em !important;
    white-space: nowrap !important;
}
.stButton > button:hover {
    background: #1d4ed8 !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 6px 20px rgba(37,99,235,0.25) !important;
}

/* outline variant for secondary actions */
button[data-secondary="true"],
.stButton.secondary > button {
    background: #fff !important; color: #374151 !important;
    border: 1.5px solid #e5e7eb !important;
}
.stButton.secondary > button:hover {
    background: #f9fafb !important; border-color: #2563eb !important;
    color: #2563eb !important; box-shadow: none !important;
}

/* ── Toolbar / expander ── */
[data-testid="stExpander"] {
    background: #f8faff; border: 1.5px solid #e0eaff !important;
    border-radius: 14px !important; margin-bottom: 8px;
}
[data-testid="stExpander"] summary {
    font-weight: 600; color: #1d4ed8; font-size: 0.88rem;
}

/* ── Stat pills ── */
.pill-row { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 0 4px; }
.pill {
    background: #f0f7ff; border: 1px solid #bfdbfe;
    border-radius: 100px; padding: 5px 14px;
    font-size: 0.78rem; font-weight: 600; color: #1d4ed8;
    display: inline-flex; align-items: center; gap: 4px;
}
.pill-neutral {
    background: #f9fafb; border: 1px solid #e5e7eb; color: #6b7280;
}

/* ── Chat ── */
.chat-outer {
    max-width: 760px; margin: 0 auto;
    padding: 32px 24px 130px;
}

.msg-user { display: flex; justify-content: flex-end; margin-bottom: 22px; }
.msg-user .bubble {
    background: #2563eb; color: #fff;
    padding: 14px 20px; border-radius: 20px 20px 4px 20px;
    max-width: 68%; font-size: 0.95rem; line-height: 1.65;
    box-shadow: 0 4px 18px rgba(37,99,235,0.22);
}

.msg-ai { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 22px; }
.ai-avatar {
    width: 38px; height: 38px; border-radius: 12px;
    background: linear-gradient(135deg, #2563eb, #60a5fa);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.1rem; flex-shrink: 0;
    box-shadow: 0 3px 12px rgba(37,99,235,0.25);
}
.msg-ai .bubble {
    background: #f9fafb; border: 1.5px solid #f0f0f0;
    color: #1f2937; padding: 14px 20px;
    border-radius: 4px 20px 20px 20px;
    max-width: 74%; font-size: 0.95rem; line-height: 1.72;
    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}
.msg-meta {
    font-size: 0.70rem; color: #9ca3af; margin-top: 5px;
    display: flex; align-items: center; gap: 6px;
}
.src-tag {
    background: #f0f7ff; border: 1px solid #bfdbfe;
    color: #2563eb; font-size: 0.68rem; font-weight: 600;
    padding: 2px 9px; border-radius: 100px; text-transform: uppercase;
    letter-spacing: 0.06em;
}

/* ── Empty states ── */
.empty { text-align: center; padding: 72px 20px; }
.empty-icon { font-size: 3.2rem; margin-bottom: 16px; }
.empty-title {
    font-family: 'DM Serif Display', serif;
    font-size: 1.7rem; color: #111827; margin-bottom: 8px;
}
.empty-sub { font-size: 0.9rem; color: #9ca3af; max-width: 300px; margin: 0 auto; line-height: 1.65; }

/* ── History cards ── */
.hist-wrap { max-width: 760px; margin: 0 auto; padding: 24px; }
.hist-card {
    background: #fff; border: 1.5px solid #f0f0f0;
    border-radius: 18px; padding: 20px 22px;
    margin-bottom: 14px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
    transition: all 0.2s;
}
.hist-card:hover {
    border-color: #2563eb;
    box-shadow: 0 4px 24px rgba(37,99,235,0.10);
}
.hist-title {
    font-family: 'DM Serif Display', serif;
    font-size: 1rem; color: #111827; margin-bottom: 4px;
}
.hist-meta { font-size: 0.78rem; color: #9ca3af; margin-bottom: 8px; }
.hist-preview { font-size: 0.85rem; color: #6b7280; line-height: 1.5; }

/* ── File uploader ── */
[data-testid="stFileUploader"] {
    background: #f8faff; border: 1.5px dashed #bfdbfe !important;
    border-radius: 14px !important; padding: 8px;
}

/* ── Divider ── */
hr { border-color: #f0f0f0 !important; margin: 8px 0 !important; }

/* ── Spinner ── */
.stSpinner > div { border-top-color: #2563eb !important; }

/* ── Scrollbar ── */
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: #fff; }
::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 3px; }
</style>
""", unsafe_allow_html=True)

# ── Session state ─────────────────────────────────────────────────────────────
DEFAULTS = {
    "messages": [],
    "chunks": [],
    "pdf_name": None,
    "pdf_pages": 0,
    "chat_archive": [],
    "input_counter": 0,
    "view": "chat",           # chat | history | archived_view
    "archived_idx": None,
}
for k, v in DEFAULTS.items():
    if k not in st.session_state:
        st.session_state[k] = v


def save_chat():
    if not st.session_state.messages:
        return
    st.session_state.chat_archive.append({
        "pdf": st.session_state.pdf_name or "Untitled",
        "email": st.user.email if st.user.is_logged_in else "unknown",
        "name": st.user.name if st.user.is_logged_in else "User",
        "timestamp": datetime.datetime.now().strftime("%d %b %Y, %I:%M %p"),
        "messages": list(st.session_state.messages),
        "count": sum(1 for m in st.session_state.messages if m["role"] == "user"),
    })


def render_messages(messages):
    for msg in messages:
        ts = msg.get("ts", "")
        if msg["role"] == "user":
            st.markdown(f"""
            <div class="msg-user">
              <div>
                <div class="bubble">{msg["content"]}</div>
                <div class="msg-meta" style="justify-content:flex-end;">{ts}</div>
              </div>
            </div>""", unsafe_allow_html=True)
        else:
            st.markdown(f"""
            <div class="msg-ai">
              <div class="ai-avatar">🧠</div>
              <div>
                <div class="bubble">{msg["content"]}</div>
                <div class="msg-meta">
                  <span class="src-tag">📎 from doc</span> {ts}
                </div>
              </div>
            </div>""", unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# AUTH GATE — uses Streamlit's native st.login() / st.user
# ══════════════════════════════════════════════════════════════════════════════
if not st.user.is_logged_in:
    # Centered auth card
    _, col, _ = st.columns([1, 2, 1])
    with col:
        st.markdown("""
        <div style="padding:60px 0 20px; text-align:center;">
          <div class="auth-logo">Doc<span class="auth-logo-dot">Mind</span> 🧠</div>
          <div class="auth-sub">Your intelligent PDF assistant.<br>Sign in to get started — it's free.</div>
        </div>
        """, unsafe_allow_html=True)

        # Google OAuth card
        st.markdown("""
        <div style="background:#fff;border:1.5px solid #e0eaff;border-radius:28px;
             padding:40px 36px;box-shadow:0 8px 60px rgba(37,99,235,0.10);text-align:center;">
          <p style="font-size:0.88rem;color:#6b7280;margin-bottom:24px;line-height:1.6;">
            Click below to sign in with your Google account.<br>
            No password needed — Google handles it securely.
          </p>
        """, unsafe_allow_html=True)

        # Google SVG logo inline
        st.markdown("""
        <div style="margin-bottom:18px;">
          <svg width="40" height="40" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
        </div>
        """, unsafe_allow_html=True)

        if st.button("Continue with Google", use_container_width=True):
            st.login()

        st.markdown("""
          <div class="auth-footer">
            By signing in you agree to our terms of service.<br>
            We never store your Google password.
          </div>
        </div>
        """, unsafe_allow_html=True)

    st.stop()


# ══════════════════════════════════════════════════════════════════════════════
# TOP NAVBAR  (logged-in users)
# ══════════════════════════════════════════════════════════════════════════════
user_name  = st.user.name  or "User"
user_email = st.user.email or ""
avatar     = st.user.picture if hasattr(st.user, "picture") and st.user.picture else "🧠"

st.markdown(f"""
<div class="topnav">
  <div class="brand">🧠 Doc<span class="brand-dot">Mind</span></div>
  <div class="nav-right">
    <span class="user-chip">👤 {user_name.split()[0]}</span>
  </div>
</div>
""", unsafe_allow_html=True)

# Nav buttons row
c1, c2, c3, c4, c5, c6 = st.columns([1.2, 1.2, 1.2, 1.2, 1.2, 1.2])
with c1:
    if st.button("💬 Chat", use_container_width=True):
        st.session_state.view = "chat"
        st.session_state.archived_idx = None
        st.rerun()
with c2:
    if st.button("🕘 History", use_container_width=True):
        st.session_state.view = "history"
        st.rerun()
with c3:
    if st.button("💾 Save", use_container_width=True):
        if st.session_state.messages:
            save_chat()
            st.toast("✅ Chat saved to History!", icon="💾")
        else:
            st.toast("Nothing to save yet.", icon="⚠️")
with c4:
    if st.button("🗑️ Clear", use_container_width=True):
        st.session_state.messages = []
        st.session_state.input_counter += 1
        st.rerun()
with c5:
    pass   # spacer
with c6:
    if st.button("🚪 Sign Out", use_container_width=True):
        st.logout()

st.markdown("<hr>", unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# PDF UPLOAD TOOLBAR
# ══════════════════════════════════════════════════════════════════════════════
with st.expander("📂 Upload / Switch Document", expanded=not st.session_state.pdf_name):
    up = st.file_uploader("PDF", type="pdf", label_visibility="collapsed")
    if up and up.name != st.session_state.pdf_name:
        with st.spinner("📖 Reading your document…"):
            text, pages = load_pdf(up)
        if not text.strip():
            st.error("⚠️ No extractable text. Please use a text-based PDF.")
        else:
            save_chat()   # auto-save previous
            st.session_state.chunks   = chunk_text(text)
            st.session_state.pdf_name = up.name
            st.session_state.pdf_pages = pages
            st.session_state.messages = []
            st.session_state.view     = "chat"
            st.rerun()

if st.session_state.pdf_name:
    st.markdown(f"""
    <div class="pill-row">
      <span class="pill">📄 {st.session_state.pdf_name[:38]}</span>
      <span class="pill">{st.session_state.pdf_pages} pages</span>
      <span class="pill">{len(st.session_state.chunks)} chunks</span>
      <span class="pill pill-neutral">👤 {user_email}</span>
    </div>""", unsafe_allow_html=True)

st.markdown("<div style='height:12px'></div>", unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# VIEW: HISTORY
# ══════════════════════════════════════════════════════════════════════════════
if st.session_state.view == "history":
    archive = st.session_state.chat_archive
    st.markdown('<div class="hist-wrap">', unsafe_allow_html=True)

    if not archive:
        st.markdown("""
        <div class="empty">
          <div class="empty-icon">🕘</div>
          <div class="empty-title">No saved chats</div>
          <div class="empty-sub">Save a chat using the Save button in the navbar — or it auto-saves when you switch PDFs.</div>
        </div>""", unsafe_allow_html=True)
    else:
        st.markdown(f"<p style='color:#9ca3af;font-size:0.83rem;margin-bottom:16px;'>{len(archive)} saved session(s)</p>", unsafe_allow_html=True)
        for i, s in enumerate(reversed(archive)):
            real_idx = len(archive) - 1 - i
            preview = s["messages"][0]["content"][:90] + "…" if s["messages"] else ""
            col_card, col_view, col_cont = st.columns([6, 1.2, 1.4])
            with col_card:
                st.markdown(f"""
                <div class="hist-card">
                  <div class="hist-title">📄 {s['pdf']}</div>
                  <div class="hist-meta">{s['timestamp']} &nbsp;·&nbsp; {s['count']} Q&amp;As &nbsp;·&nbsp; {s['email']}</div>
                  <div class="hist-preview">"{preview}"</div>
                </div>""", unsafe_allow_html=True)
            with col_view:
                st.markdown("<div style='height:24px'></div>", unsafe_allow_html=True)
                if st.button("👁️ View", key=f"v_{real_idx}", use_container_width=True):
                    st.session_state.archived_idx = real_idx
                    st.session_state.view = "archived_view"
                    st.rerun()
            with col_cont:
                st.markdown("<div style='height:24px'></div>", unsafe_allow_html=True)
                if st.button("▶️ Continue", key=f"c_{real_idx}", use_container_width=True):
                    st.session_state.messages = list(s["messages"])
                    st.session_state.chat_archive.pop(real_idx)
                    st.session_state.view = "chat"
                    st.rerun()

    st.markdown('</div>', unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# VIEW: ARCHIVED CHAT (read-only)
# ══════════════════════════════════════════════════════════════════════════════
elif st.session_state.view == "archived_view":
    idx = st.session_state.archived_idx
    s   = st.session_state.chat_archive[idx]

    col_back, col_info = st.columns([1.5, 8])
    with col_back:
        if st.button("← History"):
            st.session_state.view = "history"
            st.rerun()
    with col_info:
        st.markdown(f"""
        <div style="background:#f0f7ff;border:1px solid #bfdbfe;border-radius:10px;
             padding:10px 16px;font-size:0.84rem;color:#1d4ed8;">
          📄 <b>{s['pdf']}</b> &nbsp;·&nbsp; {s['timestamp']} &nbsp;·&nbsp; {s['count']} Q&amp;As
        </div>""", unsafe_allow_html=True)

    st.markdown("<div style='height:12px'></div>", unsafe_allow_html=True)
    st.markdown('<div class="chat-outer">', unsafe_allow_html=True)
    render_messages(s["messages"])
    st.markdown('</div>', unsafe_allow_html=True)

    if st.button("▶️ Continue this chat", use_container_width=True):
        st.session_state.messages = list(s["messages"])
        st.session_state.chat_archive.pop(idx)
        st.session_state.archived_idx = None
        st.session_state.view = "chat"
        st.rerun()


# ══════════════════════════════════════════════════════════════════════════════
# VIEW: LIVE CHAT
# ══════════════════════════════════════════════════════════════════════════════
else:
    st.markdown('<div class="chat-outer">', unsafe_allow_html=True)

    if not st.session_state.pdf_name:
        st.markdown("""
        <div class="empty">
          <div class="empty-icon">📂</div>
          <div class="empty-title">No document loaded</div>
          <div class="empty-sub">Open the upload panel above and drop in a PDF to begin.</div>
        </div>""", unsafe_allow_html=True)
    elif not st.session_state.messages:
        st.markdown(f"""
        <div class="empty">
          <div class="empty-icon">👋</div>
          <div class="empty-title">Hi, {user_name.split()[0]}!</div>
          <div class="empty-sub">Your document is ready. Ask anything about it below — press Enter to send.</div>
        </div>""", unsafe_allow_html=True)
    else:
        render_messages(st.session_state.messages)

    st.markdown('</div>', unsafe_allow_html=True)

    # ── Input bar ─────────────────────────────────────────────────────────────
    if st.session_state.pdf_name:
        def handle_submit():
            raw = st.session_state.get(f"qi_{st.session_state.input_counter}", "").strip()
            if not raw:
                return
            ts = datetime.datetime.now().strftime("%I:%M %p")
            st.session_state.messages.append({"role": "user", "content": raw, "ts": ts})
            with st.spinner("🔍 Thinking…"):
                answer = ask_llm_with_context(raw, st.session_state.chunks, st.session_state.messages[:-1])
            st.session_state.messages.append({
                "role": "assistant", "content": answer,
                "ts": datetime.datetime.now().strftime("%I:%M %p"),
            })
            st.session_state.input_counter += 1

        ci, cb = st.columns([6, 1])
        with ci:
            st.text_input(
                "q", label_visibility="collapsed",
                placeholder="Ask anything about your document… (press Enter to send)",
                key=f"qi_{st.session_state.input_counter}",
                on_change=handle_submit,
            )
        with cb:
            if st.button("Send ➤", use_container_width=True):
                handle_submit()
                st.rerun()