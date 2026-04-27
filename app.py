import datetime
import streamlit as st
from rag import load_pdf, chunk_text
from chatbot import ask_llm_with_context

st.set_page_config(
    page_title="DocMind AI",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Syne:wght@700;800&display=swap');

*, *::before, *::after { box-sizing: border-box; }
html, body, [class*="css"] {
    font-family: 'Plus Jakarta Sans', sans-serif !important;
    background: #f0f4ff !important;
    color: #1a1240 !important;
}
.stApp { background: #f0f4ff !important; }
[data-testid="collapsedControl"] { display: none !important; }
section[data-testid="stSidebar"]  { display: none !important; }

.topnav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 36px; height: 64px;
    background: linear-gradient(90deg, #6c22e0, #3b74f5, #00c9b1);
    box-shadow: 0 4px 24px rgba(108,34,224,0.25);
    position: sticky; top: 0; z-index: 999;
}
.brand {
    font-family: 'Syne', sans-serif;
    font-size: 1.5rem; font-weight: 800;
    color: #fff;
    display: flex; align-items: center; gap: 10px;
    text-shadow: 0 2px 12px rgba(0,0,0,0.18);
}
.user-chip {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(255,255,255,0.22);
    border: 1.5px solid rgba(255,255,255,0.45);
    border-radius: 100px; padding: 5px 16px;
    font-size: 0.82rem; font-weight: 700; color: #fff;
}

.pill-row { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 0 6px; }
.pill {
    background: #ede9ff; border: 1.5px solid #b39dfa;
    border-radius: 100px; padding: 5px 14px;
    font-size: 0.78rem; font-weight: 700; color: #5b21b6;
}
.pill-cyan  { background: #e0f9f6; border-color: #67e8d8; color: #0e7469; }
.pill-pink  { background: #fde8f5; border-color: #f0abda; color: #9d1a6e; }
.pill-neutral { background: #f1f1f8; border-color: #d0cce8; color: #6b6b99; }

.chat-outer { max-width: 780px; margin: 0 auto; padding: 32px 20px 140px; }

.msg-user { display: flex; justify-content: flex-end; margin-bottom: 20px; }
.msg-user .bubble {
    background: linear-gradient(135deg, #6c22e0, #3b74f5);
    color: #fff; padding: 13px 20px;
    border-radius: 22px 22px 5px 22px;
    max-width: 68%; font-size: 0.96rem; line-height: 1.7;
    box-shadow: 0 6px 24px rgba(108,34,224,0.30);
    word-break: break-word;
}
.msg-ai { display: flex; align-items: flex-start; gap: 13px; margin-bottom: 20px; }
.ai-avatar {
    width: 40px; height: 40px; border-radius: 14px; flex-shrink: 0;
    background: linear-gradient(135deg, #6c22e0, #00c9b1);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.15rem;
    box-shadow: 0 4px 16px rgba(108,34,224,0.30);
}
.msg-ai .bubble {
    background: #fff; border: 1.5px solid #e0d9ff;
    color: #1a1240; padding: 13px 20px;
    border-radius: 5px 22px 22px 22px;
    max-width: 74%; font-size: 0.96rem; line-height: 1.75;
    box-shadow: 0 4px 18px rgba(108,34,224,0.08);
    word-break: break-word;
}
.msg-meta { font-size: 0.70rem; color: #a09cc0; margin-top: 5px; display: flex; align-items: center; gap: 7px; }
.src-tag {
    background: #ede9ff; border: 1px solid #c4b5fd; color: #6c22e0;
    font-size: 0.68rem; font-weight: 700; padding: 2px 9px;
    border-radius: 100px; text-transform: uppercase; letter-spacing: 0.06em;
}

.empty { text-align: center; padding: 80px 20px; }
.empty-icon { font-size: 3.8rem; margin-bottom: 16px; display: block; }
.empty-title {
    font-family: 'Syne', sans-serif; font-size: 1.85rem; font-weight: 800;
    background: linear-gradient(135deg, #6c22e0, #3b74f5);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text; margin-bottom: 10px;
}
.empty-sub { font-size: 0.92rem; color: #8080b0; max-width: 320px; margin: 0 auto; line-height: 1.7; }

.hist-wrap { max-width: 780px; margin: 0 auto; padding: 24px; }
.hist-card {
    background: #fff; border: 1.5px solid #e0d9ff;
    border-radius: 20px; padding: 20px 24px; margin-bottom: 14px;
    box-shadow: 0 4px 18px rgba(108,34,224,0.07); transition: all 0.22s;
}
.hist-card:hover {
    border-color: #7c3aed;
    box-shadow: 0 8px 32px rgba(108,34,224,0.16);
    transform: translateY(-2px);
}
.hist-title { font-family: 'Syne', sans-serif; font-size: 1rem; font-weight: 800; color: #1a1240; margin-bottom: 4px; }
.hist-meta { font-size: 0.78rem; color: #a09cc0; margin-bottom: 8px; }
.hist-preview { font-size: 0.85rem; color: #6b6b99; line-height: 1.55; }

.section-hdr {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 20px; padding-bottom: 12px;
    border-bottom: 2px solid #e0d9ff;
}
.section-hdr-icon {
    width: 36px; height: 36px; border-radius: 10px;
    background: linear-gradient(135deg, #6c22e0, #3b74f5);
    display: flex; align-items: center; justify-content: center;
    font-size: 1rem; color: #fff;
    box-shadow: 0 3px 12px rgba(108,34,224,0.28);
}
.section-hdr-title {
    font-family: 'Syne', sans-serif; font-size: 1.25rem; font-weight: 800;
    background: linear-gradient(90deg, #6c22e0, #3b74f5);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
}

[data-testid="stExpander"] {
    background: #fff !important;
    border: 1.5px solid #c4b5fd !important;
    border-radius: 16px !important;
}
[data-testid="stExpander"] summary { font-weight: 700 !important; color: #6c22e0 !important; font-size: 0.9rem !important; }
[data-testid="stFileUploader"] {
    background: #f5f0ff !important;
    border: 1.5px dashed #a78bfa !important;
    border-radius: 14px !important;
}

.stTextInput > label { display: none !important; }
.stTextInput > div > div > input {
    background: #fff !important; border: 2px solid #c4b5fd !important;
    border-radius: 14px !important; color: #1a1240 !important;
    font-family: 'Plus Jakarta Sans', sans-serif !important;
    padding: 14px 18px !important; font-size: 0.95rem !important;
    transition: all 0.22s !important; caret-color: #6c22e0 !important;
}
.stTextInput > div > div > input::placeholder { color: #b0a8d0 !important; }
.stTextInput > div > div > input:focus {
    border-color: #6c22e0 !important;
    box-shadow: 0 0 0 4px rgba(108,34,224,0.12) !important;
}

.stButton > button {
    background: linear-gradient(135deg, #6c22e0, #3b74f5) !important;
    color: #fff !important; border: none !important;
    border-radius: 12px !important;
    font-family: 'Plus Jakarta Sans', sans-serif !important;
    font-weight: 700 !important; font-size: 0.88rem !important;
    padding: 10px 22px !important; transition: all 0.22s !important;
    box-shadow: 0 4px 16px rgba(108,34,224,0.25) !important;
}
.stButton > button:hover {
    background: linear-gradient(135deg, #5b19c0, #2c5fd4) !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 8px 28px rgba(108,34,224,0.38) !important;
}

hr { border-color: #e0d9ff !important; margin: 8px 0 !important; }
.stSpinner > div { border-top-color: #6c22e0 !important; }
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: #f0f4ff; }
::-webkit-scrollbar-thumb { background: #c4b5fd; border-radius: 3px; }
[data-testid="stToast"] {
    background: #fff !important; border: 1.5px solid #c4b5fd !important;
    color: #1a1240 !important; border-radius: 14px !important;
}
[data-testid="stAlert"] {
    background: #fff0f3 !important; border: 1.5px solid #fca5a5 !important;
    border-radius: 14px !important; color: #b91c1c !important;
}
</style>
""", unsafe_allow_html=True)

DEFAULTS = {
    "messages": [], "chunks": [], "pdf_name": None,
    "pdf_pages": 0, "chat_archive": [], "input_counter": 0,
    "view": "chat", "archived_idx": None,
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
            st.markdown(
                f'<div class="msg-user"><div>'
                f'<div class="bubble">{msg["content"]}</div>'
                f'<div class="msg-meta" style="justify-content:flex-end;">{ts}</div>'
                f'</div></div>',
                unsafe_allow_html=True)
        else:
            st.markdown(
                f'<div class="msg-ai"><div class="ai-avatar">🧠</div><div>'
                f'<div class="bubble">{msg["content"]}</div>'
                f'<div class="msg-meta"><span class="src-tag">from doc</span>{ts}</div>'
                f'</div></div>',
                unsafe_allow_html=True)


# ── AUTH GATE ─────────────────────────────────────────────────────────────────
if not st.user.is_logged_in:

    st.markdown("""
    <style>
    .stApp { background: linear-gradient(135deg, #f0e8ff 0%, #e8f0ff 40%, #e0faf6 100%) !important; }

    @keyframes floatBrain { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
    @keyframes spin360   { to { transform: rotate(360deg); } }
    @keyframes pulseRing {
        0%   { box-shadow: 0 0 0 0 rgba(108,34,224,0.45); }
        70%  { box-shadow: 0 0 0 18px rgba(108,34,224,0); }
        100% { box-shadow: 0 0 0 0 rgba(108,34,224,0); }
    }

    .auth-wrap {
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; min-height: 88vh; padding: 40px 20px;
    }
    .auth-card-box {
        background: #fff;
        border-radius: 32px;
        padding: 52px 48px 44px;
        max-width: 430px; width: 100%;
        text-align: center;
        box-shadow: 0 12px 60px rgba(108,34,224,0.18), 0 2px 8px rgba(59,116,245,0.10);
        border: 2px solid transparent;
        background-clip: padding-box;
        position: relative;
    }
    .auth-card-box::before {
        content: '';
        position: absolute; inset: -2px;
        border-radius: 34px;
        background: linear-gradient(135deg, #6c22e0, #3b74f5, #00c9b1, #f472b6);
        background-size: 300% 300%;
        animation: gradBorder 4s ease infinite;
        z-index: -1;
    }
    @keyframes gradBorder {
        0%   { background-position: 0% 50%; }
        50%  { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
    .auth-brain {
        font-size: 4rem;
        display: inline-block;
        animation: floatBrain 3s ease-in-out infinite;
        filter: drop-shadow(0 0 18px rgba(108,34,224,0.55));
        margin-bottom: 6px;
    }
    .auth-brand {
        font-family: 'Syne', sans-serif;
        font-size: 3rem; font-weight: 800;
        background: linear-gradient(135deg, #6c22e0, #3b74f5, #00c9b1);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        background-clip: text; line-height: 1.1; margin-bottom: 12px;
    }
    .auth-sub {
        font-size: 0.97rem; color: #6b6b99; line-height: 1.75; margin-bottom: 28px;
    }
    .auth-sub b { color: #6c22e0; }
    .feat-row {
        display: flex; flex-wrap: wrap; gap: 8px;
        justify-content: center; margin-bottom: 30px;
    }
    .feat-pill {
        padding: 6px 16px; border-radius: 100px;
        font-size: 0.78rem; font-weight: 700;
    }
    .fp1 { background: #ede9ff; color: #6c22e0; border: 1.5px solid #c4b5fd; }
    .fp2 { background: #e0f9f6; color: #0e7469; border: 1.5px solid #67e8d8; }
    .fp3 { background: #fde8f5; color: #9d1a6e; border: 1.5px solid #f0abda; }
    .fp4 { background: #fef3c7; color: #92400e; border: 1.5px solid #fcd34d; }
    .auth-divider {
        display: flex; align-items: center; gap: 12px; margin-bottom: 22px;
    }
    .auth-divider::before, .auth-divider::after {
        content: ''; flex: 1; height: 1.5px;
        background: linear-gradient(90deg, transparent, #c4b5fd, transparent);
    }
    .auth-divider span { font-size: 0.78rem; color: #a09cc0; white-space: nowrap; font-weight: 600; }
    .goog-icon-row { margin-bottom: 16px; }

    .stButton > button {
        background: linear-gradient(135deg, #6c22e0, #3b74f5, #00c9b1) !important;
        background-size: 200% 200% !important;
        animation: gradBorder 3s ease infinite !important;
        border-radius: 16px !important;
        font-size: 1.05rem !important; font-weight: 800 !important;
        padding: 17px 32px !important; letter-spacing: 0.02em !important;
        box-shadow: 0 8px 32px rgba(108,34,224,0.38) !important;
        border: none !important; color: #fff !important;
        animation: pulseRing 2s ease-out infinite !important;
    }
    .stButton > button:hover {
        transform: translateY(-3px) scale(1.02) !important;
        box-shadow: 0 16px 48px rgba(108,34,224,0.52) !important;
    }
    </style>
    """, unsafe_allow_html=True)

    _, col, _ = st.columns([1, 2, 1])
    with col:
        st.markdown(
            '<div class="auth-wrap">'
            '<div class="auth-card-box">'
            '<div class="auth-brain">🧠</div>'
            '<div class="auth-brand">DocMind</div>'
            '<p class="auth-sub">Your <b>AI-powered PDF assistant.</b><br>Upload any document. Ask anything. Get answers instantly.</p>'
            '<div class="feat-row">'
            '<span class="feat-pill fp1">⚡ Instant Q&amp;A</span>'
            '<span class="feat-pill fp2">🔒 Secure</span>'
            '<span class="feat-pill fp3">💬 History</span>'
            '<span class="feat-pill fp4">🆓 Free</span>'
            '</div>'
            '<div class="auth-divider"><span>Sign in to continue</span></div>'
            '<div class="goog-icon-row">'
            '<svg width="34" height="34" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">'
            '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>'
            '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>'
            '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>'
            '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>'
            '</svg>'
            '</div>'
            '</div>'
            '</div>',
            unsafe_allow_html=True
        )

        if st.button("🚀  Continue with Google", use_container_width=True):
            st.login()

        st.markdown(
            '<p style="text-align:center;font-size:0.76rem;color:#b0a8d0;margin-top:14px;line-height:1.8;">'
            'By signing in you agree to our terms of service.<br>We never store your Google password.</p>',
            unsafe_allow_html=True
        )

    st.stop()


# ── TOP NAVBAR ────────────────────────────────────────────────────────────────
user_name  = st.user.name  or "User"
user_email = st.user.email or ""

st.markdown(
    f'<div class="topnav">'
    f'<div class="brand">🧠 DocMind</div>'
    f'<div class="user-chip">👤 {user_name.split()[0]}</div>'
    f'</div>',
    unsafe_allow_html=True
)

c1, c2, c3, c4, c5, c6 = st.columns([1.2, 1.2, 1.2, 1.2, 1.2, 1.2])
with c1:
    if st.button("💬 Chat", use_container_width=True):
        st.session_state.view = "chat"; st.session_state.archived_idx = None; st.rerun()
with c2:
    if st.button("🕘 History", use_container_width=True):
        st.session_state.view = "history"; st.rerun()
with c3:
    if st.button("💾 Save", use_container_width=True):
        if st.session_state.messages:
            save_chat(); st.toast("✅ Saved!", icon="💾")
        else:
            st.toast("Nothing to save yet.", icon="⚠️")
with c4:
    if st.button("🗑️ Clear", use_container_width=True):
        st.session_state.messages = []; st.session_state.input_counter += 1; st.rerun()
with c5:
    pass
with c6:
    if st.button("🚪 Sign Out", use_container_width=True):
        st.logout()

st.markdown("<hr>", unsafe_allow_html=True)

with st.expander("📂 Upload / Switch Document", expanded=not st.session_state.pdf_name):
    up = st.file_uploader("PDF", type="pdf", label_visibility="collapsed")
    if up and up.name != st.session_state.pdf_name:
        with st.spinner("📖 Reading your document…"):
            text, pages = load_pdf(up)
        if not text.strip():
            st.error("⚠️ No extractable text. Please use a text-based PDF.")
        else:
            save_chat()
            st.session_state.chunks    = chunk_text(text)
            st.session_state.pdf_name  = up.name
            st.session_state.pdf_pages = pages
            st.session_state.messages  = []
            st.session_state.view      = "chat"
            st.rerun()

if st.session_state.pdf_name:
    st.markdown(
        f'<div class="pill-row">'
        f'<span class="pill">📄 {st.session_state.pdf_name[:38]}</span>'
        f'<span class="pill pill-cyan">📃 {st.session_state.pdf_pages} pages</span>'
        f'<span class="pill pill-pink">🧩 {len(st.session_state.chunks)} chunks</span>'
        f'<span class="pill pill-neutral">👤 {user_email}</span>'
        f'</div>',
        unsafe_allow_html=True
    )

st.markdown("<div style='height:10px'></div>", unsafe_allow_html=True)


# ── HISTORY VIEW ──────────────────────────────────────────────────────────────
if st.session_state.view == "history":
    archive = st.session_state.chat_archive
    st.markdown(
        '<div class="hist-wrap">'
        '<div class="section-hdr">'
        '<div class="section-hdr-icon">🕘</div>'
        '<div class="section-hdr-title">Chat History</div>'
        '</div>',
        unsafe_allow_html=True
    )
    if not archive:
        st.markdown(
            '<div class="empty">'
            '<span class="empty-icon">🕘</span>'
            '<div class="empty-title">No saved chats yet</div>'
            '<div class="empty-sub">Save a chat using the Save button — or it auto-saves when you switch PDFs.</div>'
            '</div>',
            unsafe_allow_html=True
        )
    else:
        st.markdown(f"<p style='color:#a09cc0;font-size:0.83rem;margin-bottom:16px;'>{len(archive)} saved session(s)</p>", unsafe_allow_html=True)
        for i, s in enumerate(reversed(archive)):
            real_idx = len(archive) - 1 - i
            preview  = s["messages"][0]["content"][:90] + "…" if s["messages"] else ""
            col_card, col_view, col_cont = st.columns([6, 1.2, 1.4])
            with col_card:
                st.markdown(
                    f'<div class="hist-card">'
                    f'<div class="hist-title">📄 {s["pdf"]}</div>'
                    f'<div class="hist-meta">{s["timestamp"]} &nbsp;·&nbsp; {s["count"]} Q&amp;As &nbsp;·&nbsp; {s["email"]}</div>'
                    f'<div class="hist-preview">"{preview}"</div>'
                    f'</div>',
                    unsafe_allow_html=True
                )
            with col_view:
                st.markdown("<div style='height:24px'></div>", unsafe_allow_html=True)
                if st.button("👁️ View", key=f"v_{real_idx}", use_container_width=True):
                    st.session_state.archived_idx = real_idx
                    st.session_state.view = "archived_view"; st.rerun()
            with col_cont:
                st.markdown("<div style='height:24px'></div>", unsafe_allow_html=True)
                if st.button("▶️ Continue", key=f"c_{real_idx}", use_container_width=True):
                    st.session_state.messages = list(s["messages"])
                    st.session_state.chat_archive.pop(real_idx)
                    st.session_state.view = "chat"; st.rerun()
    st.markdown('</div>', unsafe_allow_html=True)


# ── ARCHIVED CHAT VIEW ────────────────────────────────────────────────────────
elif st.session_state.view == "archived_view":
    idx = st.session_state.archived_idx
    s   = st.session_state.chat_archive[idx]
    col_back, col_info = st.columns([1.5, 8])
    with col_back:
        if st.button("← Back"):
            st.session_state.view = "history"; st.rerun()
    with col_info:
        st.markdown(
            f'<div style="background:#ede9ff;border:1.5px solid #c4b5fd;border-radius:12px;'
            f'padding:10px 18px;font-size:0.84rem;color:#5b21b6;">'
            f'📄 <b>{s["pdf"]}</b> &nbsp;·&nbsp; {s["timestamp"]} &nbsp;·&nbsp; {s["count"]} Q&amp;As</div>',
            unsafe_allow_html=True
        )
    st.markdown("<div style='height:12px'></div>", unsafe_allow_html=True)
    st.markdown('<div class="chat-outer">', unsafe_allow_html=True)
    render_messages(s["messages"])
    st.markdown('</div>', unsafe_allow_html=True)
    if st.button("▶️ Continue this chat", use_container_width=True):
        st.session_state.messages = list(s["messages"])
        st.session_state.chat_archive.pop(idx)
        st.session_state.archived_idx = None
        st.session_state.view = "chat"; st.rerun()


# ── LIVE CHAT VIEW ────────────────────────────────────────────────────────────
else:
    st.markdown('<div class="chat-outer">', unsafe_allow_html=True)
    if not st.session_state.pdf_name:
        st.markdown(
            '<div class="empty"><span class="empty-icon">📂</span>'
            '<div class="empty-title">No document loaded</div>'
            '<div class="empty-sub">Open the upload panel above and drop in a PDF to begin.</div>'
            '</div>',
            unsafe_allow_html=True
        )
    elif not st.session_state.messages:
        st.markdown(
            f'<div class="empty"><span class="empty-icon">👋</span>'
            f'<div class="empty-title">Hey, {user_name.split()[0]}!</div>'
            f'<div class="empty-sub">Your document is ready. Ask anything about it below.</div>'
            f'</div>',
            unsafe_allow_html=True
        )
    else:
        render_messages(st.session_state.messages)
    st.markdown('</div>', unsafe_allow_html=True)

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
                placeholder="Ask anything about your document… (Enter to send)",
                key=f"qi_{st.session_state.input_counter}",
                on_change=handle_submit,
            )
        with cb:
            if st.button("Send ➤", use_container_width=True):
                handle_submit(); st.rerun()