import datetime
import streamlit as st
from rag import load_pdf, chunk_text
from chatbot import ask_llm_with_context

st.set_page_config(
    page_title="DocMind AI",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─────────────────────────────────────────────────────────────────────────────
# GLOBAL CSS
# ─────────────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');

:root {
    --bg:       #F7F5FF;
    --surface:  #FFFFFF;
    --border:   #E4DEFF;
    --violet:   #5B21B6;
    --violet2:  #7C3AED;
    --indigo:   #4338CA;
    --sky:      #0EA5E9;
    --teal:     #0D9488;
    --rose:     #E11D48;
    --amber:    #D97706;
    --text:     #18113A;
    --muted:    #6B6B99;
    --radius:   18px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body, [class*="css"] {
    font-family: 'Bricolage Grotesque', sans-serif !important;
    background: var(--bg) !important;
    color: var(--text) !important;
}
.stApp { background: var(--bg) !important; }

/* ── Hide Streamlit chrome ─────────────────────────────────────────────── */
#MainMenu, footer, header { visibility: hidden !important; }
[data-testid="collapsedControl"] { display: none !important; }

/* ── Sidebar ────────────────────────────────────────────────────────────── */
section[data-testid="stSidebar"] {
    background: var(--surface) !important;
    border-right: 1.5px solid var(--border) !important;
    width: 270px !important;
    padding: 0 !important;
}
section[data-testid="stSidebar"] > div:first-child { padding: 0 !important; }

/* ── Main content area ──────────────────────────────────────────────────── */
.main .block-container {
    padding: 28px 36px 80px !important;
    max-width: 100% !important;
}

/* ── Inputs ─────────────────────────────────────────────────────────────── */
.stTextInput > label { display: none !important; }
.stTextInput > div > div > input {
    background: var(--surface) !important;
    border: 2px solid var(--border) !important;
    border-radius: 14px !important;
    color: var(--text) !important;
    font-family: 'Bricolage Grotesque', sans-serif !important;
    padding: 14px 18px !important;
    font-size: 0.96rem !important;
    transition: all 0.2s !important;
    caret-color: var(--violet2) !important;
}
.stTextInput > div > div > input::placeholder { color: #B0A8D0 !important; }
.stTextInput > div > div > input:focus {
    border-color: var(--violet2) !important;
    box-shadow: 0 0 0 4px rgba(124,58,237,0.10) !important;
    outline: none !important;
}

/* ── Buttons ─────────────────────────────────────────────────────────────── */
.stButton > button {
    background: linear-gradient(135deg, var(--violet2), var(--indigo)) !important;
    color: #fff !important; border: none !important;
    border-radius: 12px !important;
    font-family: 'Bricolage Grotesque', sans-serif !important;
    font-weight: 700 !important; font-size: 0.88rem !important;
    padding: 10px 20px !important; transition: all 0.2s !important;
    box-shadow: 0 4px 14px rgba(91,33,182,0.22) !important;
    white-space: nowrap !important;
}
.stButton > button:hover {
    background: linear-gradient(135deg, #6d28d9, #3730a3) !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 8px 24px rgba(91,33,182,0.32) !important;
}

/* ── Expander ────────────────────────────────────────────────────────────── */
[data-testid="stExpander"] {
    background: var(--surface) !important;
    border: 1.5px solid var(--border) !important;
    border-radius: var(--radius) !important;
}
[data-testid="stExpander"] summary {
    font-weight: 700 !important;
    color: var(--violet) !important;
    font-size: 0.92rem !important;
}

/* ── File uploader ───────────────────────────────────────────────────────── */
[data-testid="stFileUploader"] {
    background: #F3EEFF !important;
    border: 2px dashed #C4B5FD !important;
    border-radius: 14px !important;
}

/* ── Misc ────────────────────────────────────────────────────────────────── */
hr { border-color: var(--border) !important; margin: 12px 0 !important; }
.stSpinner > div { border-top-color: var(--violet2) !important; }
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: #C4B5FD; border-radius: 6px; }
[data-testid="stToast"] {
    background: var(--surface) !important;
    border: 1.5px solid var(--border) !important;
    color: var(--text) !important;
    border-radius: 14px !important;
    box-shadow: 0 4px 20px rgba(91,33,182,0.12) !important;
}
[data-testid="stAlert"] {
    background: #FFF0F3 !important;
    border: 1.5px solid #FECDD3 !important;
    border-radius: 14px !important;
    color: #9F1239 !important;
}

/* ── Chat bubbles ────────────────────────────────────────────────────────── */
.chat-outer { padding: 8px 0 120px; }

.msg-user { display: flex; justify-content: flex-end; margin-bottom: 20px; }
.msg-user .bubble {
    background: linear-gradient(135deg, #7C3AED, #4338CA);
    color: #fff; padding: 14px 20px;
    border-radius: 22px 22px 4px 22px;
    max-width: 70%; font-size: 0.95rem; line-height: 1.7;
    box-shadow: 0 6px 22px rgba(91,33,182,0.28);
    word-break: break-word;
}
.msg-ai { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 20px; }
.ai-avatar {
    width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0;
    background: linear-gradient(135deg, #7C3AED, #0EA5E9);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.1rem;
    box-shadow: 0 4px 14px rgba(91,33,182,0.28);
}
.msg-ai .bubble {
    background: var(--surface);
    border: 1.5px solid var(--border);
    color: var(--text); padding: 14px 20px;
    border-radius: 4px 22px 22px 22px;
    max-width: 76%; font-size: 0.95rem; line-height: 1.75;
    box-shadow: 0 3px 16px rgba(91,33,182,0.07);
    word-break: break-word;
}
.msg-meta {
    font-size: 0.70rem; color: #B0A8D0; margin-top: 5px;
    display: flex; align-items: center; gap: 6px;
}
.src-tag {
    background: #EDE9FF; border: 1px solid #C4B5FD; color: #5B21B6;
    font-size: 0.67rem; font-weight: 700; padding: 2px 9px;
    border-radius: 100px; text-transform: uppercase; letter-spacing: 0.06em;
}

/* ── Empty state ─────────────────────────────────────────────────────────── */
.empty-state {
    text-align: center; padding: 72px 20px;
    background: var(--surface);
    border-radius: 24px;
    border: 1.5px solid var(--border);
    margin-top: 24px;
}
.empty-icon { font-size: 3.4rem; display: block; margin-bottom: 18px; }
.empty-title {
    font-family: 'Instrument Serif', serif;
    font-size: 1.9rem; color: var(--text);
    margin-bottom: 10px;
}
.empty-sub { font-size: 0.92rem; color: var(--muted); max-width: 310px; margin: 0 auto; line-height: 1.7; }

/* ── History cards ───────────────────────────────────────────────────────── */
.hist-card {
    background: var(--surface); border: 1.5px solid var(--border);
    border-radius: 18px; padding: 20px 22px; margin-bottom: 14px;
    box-shadow: 0 3px 16px rgba(91,33,182,0.06); transition: all 0.2s;
    cursor: default;
}
.hist-card:hover {
    border-color: #C4B5FD;
    box-shadow: 0 8px 30px rgba(91,33,182,0.14);
    transform: translateY(-2px);
}
.hist-title { font-weight: 700; font-size: 0.97rem; color: var(--text); margin-bottom: 4px; }
.hist-meta  { font-size: 0.78rem; color: var(--muted); margin-bottom: 6px; }
.hist-preview { font-size: 0.84rem; color: #8080B0; line-height: 1.5; font-style: italic; }

/* ── Page header ─────────────────────────────────────────────────────────── */
.page-header {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 24px;
}
.page-header-icon {
    width: 42px; height: 42px; border-radius: 13px;
    background: linear-gradient(135deg, #7C3AED, #0EA5E9);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.15rem; color: #fff;
    box-shadow: 0 4px 16px rgba(91,33,182,0.28);
}
.page-header-title {
    font-family: 'Instrument Serif', serif;
    font-size: 1.6rem; color: var(--text);
}

/* ── Stat grid ───────────────────────────────────────────────────────────── */
.stat-grid { display: flex; gap: 10px; flex-wrap: wrap; margin: 12px 0 6px; }
.stat-card {
    background: var(--surface); border: 1.5px solid var(--border);
    border-radius: 14px; padding: 12px 18px;
    flex: 1; min-width: 90px;
    box-shadow: 0 2px 10px rgba(91,33,182,0.06);
}
.stat-val { font-size: 1.3rem; font-weight: 800; color: var(--violet); line-height: 1.2; }
.stat-lbl { font-size: 0.72rem; color: var(--muted); font-weight: 600; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.06em; }

/* ── Watermark / bg pattern ──────────────────────────────────────────────── */
.watermark {
    position: fixed; bottom: 24px; right: 28px;
    font-size: 0.72rem; color: #C4B5FD; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
    pointer-events: none; z-index: 9999;
    display: flex; align-items: center; gap: 6px;
}
.wm-dot { width: 6px; height: 6px; border-radius: 50%; background: #7C3AED; display: inline-block; }

/* ── Archived view banner ────────────────────────────────────────────────── */
.arch-banner {
    background: #EDE9FF; border: 1.5px solid #C4B5FD;
    border-radius: 14px; padding: 12px 20px;
    font-size: 0.86rem; color: #5B21B6; font-weight: 600;
    margin-bottom: 16px;
}

/* ── Input bar wrapper ───────────────────────────────────────────────────── */
.input-hint {
    font-size: 0.76rem; color: #B0A8D0; margin-top: 6px;
    text-align: center;
}
</style>
""", unsafe_allow_html=True)

# ─────────────────────────────────────────────────────────────────────────────
# SESSION STATE
# ─────────────────────────────────────────────────────────────────────────────
DEFAULTS = {
    "messages": [], "chunks": [], "pdf_name": None,
    "pdf_pages": 0, "word_count": 0, "chat_archive": [],
    "input_counter": 0, "view": "chat", "archived_idx": None,
}
for k, v in DEFAULTS.items():
    if k not in st.session_state:
        st.session_state[k] = v


def save_chat():
    if not st.session_state.messages:
        return
    st.session_state.chat_archive.append({
        "pdf":       st.session_state.pdf_name or "Untitled",
        "email":     st.user.email if st.user.is_logged_in else "unknown",
        "name":      st.user.name  if st.user.is_logged_in else "User",
        "timestamp": datetime.datetime.now().strftime("%d %b %Y, %I:%M %p"),
        "messages":  list(st.session_state.messages),
        "count":     sum(1 for m in st.session_state.messages if m["role"] == "user"),
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


def count_words(text: str) -> int:
    return len(text.split())


def fmt_num(n: int) -> str:
    if n >= 1000:
        return f"{n/1000:.1f}k"
    return str(n)


# ─────────────────────────────────────────────────────────────────────────────
# AUTH GATE
# ─────────────────────────────────────────────────────────────────────────────
if not st.user.is_logged_in:

    st.markdown("""
    <style>
    .stApp {
        background: linear-gradient(145deg, #EDE9FE 0%, #E0F2FE 40%, #CCFBF1 75%, #FDF4FF 100%) !important;
        min-height: 100vh;
    }
    .main .block-container { padding: 0 !important; }
    section[data-testid="stSidebar"] { display: none !important; }

    @keyframes floatY   { 0%,100%{transform:translateY(0)}    50%{transform:translateY(-12px)} }
    @keyframes rotateSlow { to { transform: rotate(360deg); } }
    @keyframes fadeUp   { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
    @keyframes gradAnim { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
    @keyframes pulseBtn {
        0%,100% { box-shadow: 0 8px 32px rgba(91,33,182,0.32); }
        50%     { box-shadow: 0 8px 48px rgba(91,33,182,0.58); }
    }

    .login-root {
        display: flex; min-height: 100vh;
    }

    /* Left hero panel */
    .login-hero {
        flex: 1.1;
        background: linear-gradient(145deg, #5B21B6, #4338CA, #0EA5E9, #0D9488);
        background-size: 300% 300%;
        animation: gradAnim 7s ease infinite;
        display: flex; flex-direction: column;
        justify-content: center; align-items: flex-start;
        padding: 64px 60px;
        position: relative; overflow: hidden;
    }
    .hero-circles {
        position: absolute; inset: 0; pointer-events: none; overflow: hidden;
    }
    .hero-circles span {
        position: absolute; border-radius: 50%;
        background: rgba(255,255,255,0.07);
    }
    .hc1 { width:320px; height:320px; top:-60px; right:-80px; animation: rotateSlow 18s linear infinite; }
    .hc2 { width:200px; height:200px; bottom:40px; left:20px; animation: rotateSlow 12s linear infinite reverse; }
    .hc3 { width:120px; height:120px; top:50%; right:10%; animation: floatY 6s ease infinite; }

    .hero-badge {
        background: rgba(255,255,255,0.18);
        border: 1px solid rgba(255,255,255,0.35);
        border-radius: 100px; padding: 6px 18px;
        font-size: 0.76rem; font-weight: 700; color: #fff;
        letter-spacing: 0.1em; text-transform: uppercase;
        margin-bottom: 28px;
        animation: fadeUp 0.6s ease both;
    }
    .hero-brand {
        font-family: 'Instrument Serif', serif;
        font-size: 4.2rem; color: #fff; line-height: 1.05;
        margin-bottom: 20px;
        animation: fadeUp 0.7s 0.1s ease both;
        white-space: nowrap;
    }
    .hero-sub {
        font-size: 1.05rem; color: rgba(255,255,255,0.82); line-height: 1.75;
        max-width: 380px; margin-bottom: 44px;
        animation: fadeUp 0.7s 0.2s ease both;
    }
    .hero-features { display: flex; flex-direction: column; gap: 16px; animation: fadeUp 0.7s 0.3s ease both; }
    .hero-feat {
        display: flex; align-items: center; gap: 14px;
    }
    .feat-icon {
        width: 40px; height: 40px; border-radius: 12px;
        background: rgba(255,255,255,0.18);
        border: 1px solid rgba(255,255,255,0.30);
        display: flex; align-items: center; justify-content: center;
        font-size: 1.1rem; flex-shrink: 0;
    }
    .feat-text { font-size: 0.92rem; color: rgba(255,255,255,0.88); font-weight: 500; }
    .feat-text b { color: #fff; font-weight: 700; }

    /* Right sign-in panel */
    .login-panel {
        flex: 0.9;
        display: flex; flex-direction: column;
        justify-content: center; align-items: center;
        padding: 60px 52px;
        background: rgba(255,255,255,0.75);
        backdrop-filter: blur(24px);
    }
    .login-top { text-align: center; margin-bottom: 36px; }
    .login-brain {
        font-size: 3.2rem; display: inline-block;
        animation: floatY 3s ease-in-out infinite;
        filter: drop-shadow(0 0 16px rgba(91,33,182,0.45));
        margin-bottom: 10px;
    }
    .login-title {
        font-family: 'Instrument Serif', serif;
        font-size: 2.4rem; color: #18113A; line-height: 1.1;
        white-space: nowrap; margin-bottom: 8px;
    }
    .login-desc { font-size: 0.92rem; color: #6B6B99; line-height: 1.65; }

    .login-card {
        width: 100%; max-width: 380px;
        background: #fff;
        border-radius: 24px;
        padding: 36px 36px 28px;
        box-shadow: 0 8px 48px rgba(91,33,182,0.13), 0 2px 8px rgba(0,0,0,0.05);
        border: 1.5px solid #EDE9FE;
    }
    .goog-row {
        display: flex; align-items: center; justify-content: center;
        gap: 10px; margin-bottom: 20px;
    }
    .login-divider {
        text-align: center; font-size: 0.78rem; color: #B0A8D0;
        font-weight: 600; margin-bottom: 18px; position: relative;
    }
    .login-divider::before, .login-divider::after {
        content: ''; position: absolute; top: 50%; width: 38%;
        height: 1.5px; background: #EDE9FE;
    }
    .login-divider::before { left: 0; }
    .login-divider::after  { right: 0; }

    .trust-badges {
        display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;
        margin-top: 20px;
    }
    .trust-pill {
        padding: 5px 13px; border-radius: 100px;
        font-size: 0.73rem; font-weight: 700;
    }
    .tp1 { background: #EDE9FF; color: #5B21B6; border: 1px solid #C4B5FD; }
    .tp2 { background: #E0F9F6; color: #0E7469; border: 1px solid #67E8D8; }
    .tp3 { background: #FFF7ED; color: #92400E; border: 1px solid #FCD34D; }
    .login-footer {
        text-align: center; font-size: 0.73rem; color: #B0A8D0;
        margin-top: 20px; line-height: 1.7;
    }

    .stButton > button {
        background: linear-gradient(135deg, #7C3AED, #4338CA) !important;
        background-size: 200% !important;
        border-radius: 14px !important;
        font-size: 1.02rem !important; font-weight: 800 !important;
        padding: 16px 28px !important;
        box-shadow: none !important;
        animation: pulseBtn 2.4s ease-in-out infinite !important;
        letter-spacing: 0.01em !important;
    }
    .stButton > button:hover {
        transform: translateY(-2px) scale(1.015) !important;
        background: linear-gradient(135deg, #6D28D9, #3730A3) !important;
    }
    </style>
    """, unsafe_allow_html=True)

    _, col, _ = st.columns([1, 1.6, 1])
    with col:
        st.markdown(
            '<div class="login-root">'

            # Hero left
            '<div class="login-hero">'
            '<div class="hero-circles">'
            '<span class="hc1"></span><span class="hc2"></span><span class="hc3"></span>'
            '</div>'
            '<div class="hero-badge">✦ AI-Powered PDF Assistant</div>'
            '<div class="hero-brand">DocMind AI</div>'
            '<p class="hero-sub">Transform any PDF into an interactive conversation. Ask questions, extract insights, and understand complex documents instantly.</p>'
            '<div class="hero-features">'
            '<div class="hero-feat"><div class="feat-icon">⚡</div><div class="feat-text"><b>Instant answers</b> from any PDF document</div></div>'
            '<div class="hero-feat"><div class="feat-icon">🧠</div><div class="feat-text"><b>AI-powered</b> context-aware understanding</div></div>'
            '<div class="hero-feat"><div class="feat-icon">🔒</div><div class="feat-text"><b>Secure &amp; private</b> — your data stays yours</div></div>'
            '</div>'
            '</div>'

            # Right panel — login
            '<div class="login-panel">'
            '<div class="login-top">'
            '<div class="login-brain">🧠</div>'
            '<div class="login-title">Welcome back</div>'
            '<p class="login-desc">Sign in to start chatting with your documents.</p>'
            '</div>'
            '<div class="login-card">'
            '<div class="login-divider">Continue with</div>'
            '<div class="goog-row">'
            '<svg width="26" height="26" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">'
            '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>'
            '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>'
            '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>'
            '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>'
            '</svg>'
            '</div>',
            unsafe_allow_html=True
        )

        if st.button("Sign in with Google", use_container_width=True):
            st.login()

        st.markdown(
            '<div class="trust-badges">'
            '<span class="trust-pill tp1">🆓 Free forever</span>'
            '<span class="trust-pill tp2">⚡ Instant setup</span>'
            '<span class="trust-pill tp3">📄 Any PDF</span>'
            '</div>'
            '</div>'
            '<p class="login-footer">By signing in you agree to our terms.<br>We never store your Google password.</p>'
            '</div>'
            '</div>',
            unsafe_allow_html=True
        )

    st.stop()


# ─────────────────────────────────────────────────────────────────────────────
# SIDEBAR
# ─────────────────────────────────────────────────────────────────────────────
user_name  = st.user.name  or "User"
user_email = st.user.email or ""
first_name = user_name.split()[0]

with st.sidebar:
    # Brand
    st.markdown(
        '<div style="padding:28px 24px 20px;">'
        '<div style="font-family:\'Instrument Serif\',serif;font-size:1.8rem;color:#18113A;line-height:1.1;margin-bottom:4px;">🧠 DocMind</div>'
        '<div style="font-size:0.75rem;color:#B0A8D0;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">AI PDF Assistant</div>'
        '</div>',
        unsafe_allow_html=True
    )

    st.markdown('<div style="height:1px;background:#EDE9FE;margin:0 16px 20px;"></div>', unsafe_allow_html=True)

    # User card
    st.markdown(
        f'<div style="margin:0 16px 20px;background:linear-gradient(135deg,#EDE9FF,#E0F2FE);'
        f'border:1.5px solid #C4B5FD;border-radius:16px;padding:16px 18px;">'
        f'<div style="font-size:0.72rem;color:#8080B0;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;margin-bottom:6px;">Signed in as</div>'
        f'<div style="font-weight:800;color:#18113A;font-size:0.96rem;margin-bottom:2px;">{first_name}</div>'
        f'<div style="font-size:0.78rem;color:#8080B0;word-break:break-all;">{user_email}</div>'
        f'</div>',
        unsafe_allow_html=True
    )

    # Navigation
    st.markdown('<div style="padding:0 16px;margin-bottom:8px;font-size:0.72rem;color:#B0A8D0;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Navigation</div>', unsafe_allow_html=True)

    nav_items = [("💬", "Chat",    "chat"),
                 ("🕘", "History", "history")]
    for icon, label, key in nav_items:
        is_active = st.session_state.view == key
        bg = "background:linear-gradient(135deg,#7C3AED,#4338CA);color:#fff;" if is_active else "background:#F3EEFF;color:#5B21B6;"
        border = "border:none;" if is_active else "border:1.5px solid #C4B5FD;"
        clicked = st.button(f"{icon}  {label}", key=f"nav_{key}", use_container_width=True)
        if clicked:
            st.session_state.view = key
            if key == "chat":
                st.session_state.archived_idx = None
            st.rerun()

    st.markdown('<div style="height:1px;background:#EDE9FE;margin:16px 16px;"></div>', unsafe_allow_html=True)

    # Actions
    st.markdown('<div style="padding:0 16px;margin-bottom:8px;font-size:0.72rem;color:#B0A8D0;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Actions</div>', unsafe_allow_html=True)

    col_s, col_c = st.columns(2)
    with col_s:
        if st.button("💾 Save", use_container_width=True):
            if st.session_state.messages:
                save_chat()
                st.toast("✅ Chat saved!", icon="💾")
            else:
                st.toast("Nothing to save.", icon="⚠️")
    with col_c:
        if st.button("🗑️ Clear", use_container_width=True):
            st.session_state.messages = []
            st.session_state.input_counter += 1
            st.rerun()

    st.markdown('<div style="height:1px;background:#EDE9FE;margin:16px 16px;"></div>', unsafe_allow_html=True)

    # PDF upload
    st.markdown('<div style="padding:0 16px;margin-bottom:10px;font-size:0.72rem;color:#B0A8D0;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Document</div>', unsafe_allow_html=True)

    with st.container():
        up = st.file_uploader("Upload PDF", type="pdf", label_visibility="collapsed")
        if up and up.name != st.session_state.pdf_name:
            with st.spinner("Reading document…"):
                text, pages = load_pdf(up)
            if not text.strip():
                st.error("No extractable text found.")
            else:
                save_chat()
                st.session_state.chunks    = chunk_text(text)
                st.session_state.pdf_name  = up.name
                st.session_state.pdf_pages = pages
                st.session_state.word_count = count_words(text)
                st.session_state.messages  = []
                st.session_state.view      = "chat"
                st.rerun()

    # Doc stats
    if st.session_state.pdf_name:
        fname = st.session_state.pdf_name
        fname_display = fname[:22] + "…" if len(fname) > 22 else fname
        st.markdown(
            f'<div style="margin:12px 0 0;background:#F3EEFF;border:1.5px solid #C4B5FD;'
            f'border-radius:14px;padding:14px 16px;">'
            f'<div style="font-size:0.78rem;font-weight:800;color:#5B21B6;margin-bottom:10px;'
            f'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">📄 {fname_display}</div>'
            f'<div style="display:flex;gap:8px;">'
            f'<div style="flex:1;background:#fff;border-radius:10px;padding:8px 10px;border:1px solid #DDD6FE;">'
            f'<div style="font-size:1.1rem;font-weight:800;color:#5B21B6;">{st.session_state.pdf_pages}</div>'
            f'<div style="font-size:0.65rem;color:#8080B0;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Pages</div>'
            f'</div>'
            f'<div style="flex:1;background:#fff;border-radius:10px;padding:8px 10px;border:1px solid #DDD6FE;">'
            f'<div style="font-size:1.1rem;font-weight:800;color:#0EA5E9;">{fmt_num(st.session_state.word_count)}</div>'
            f'<div style="font-size:0.65rem;color:#8080B0;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Words</div>'
            f'</div>'
            f'</div>'
            f'</div>',
            unsafe_allow_html=True
        )

    # Push sign-out to bottom
    st.markdown('<div style="flex:1;"></div>', unsafe_allow_html=True)
    st.markdown('<div style="height:1px;background:#EDE9FE;margin:20px 16px 16px;"></div>', unsafe_allow_html=True)
    if st.button("🚪  Sign Out", use_container_width=True):
        st.logout()

    # Sidebar watermark
    st.markdown(
        '<div style="padding:0 16px 20px;font-size:0.68rem;color:#D4C8FF;text-align:center;font-weight:700;letter-spacing:0.1em;">DOCMIND AI · v2.0</div>',
        unsafe_allow_html=True
    )


# ─────────────────────────────────────────────────────────────────────────────
# MAIN CONTENT
# ─────────────────────────────────────────────────────────────────────────────

# Watermark
st.markdown(
    '<div class="watermark"><span class="wm-dot"></span>DocMind AI<span class="wm-dot"></span></div>',
    unsafe_allow_html=True
)

# ── HISTORY VIEW ──────────────────────────────────────────────────────────────
if st.session_state.view == "history":
    st.markdown(
        '<div class="page-header">'
        '<div class="page-header-icon">🕘</div>'
        '<div class="page-header-title">Chat History</div>'
        '</div>',
        unsafe_allow_html=True
    )

    archive = st.session_state.chat_archive
    if not archive:
        st.markdown(
            '<div class="empty-state">'
            '<span class="empty-icon">🗂️</span>'
            '<div class="empty-title">No saved chats yet</div>'
            '<div class="empty-sub">Save a conversation with the Save button, or it auto-saves when you switch documents.</div>'
            '</div>',
            unsafe_allow_html=True
        )
    else:
        st.markdown(f'<p style="color:#B0A8D0;font-size:0.82rem;margin-bottom:18px;">{len(archive)} saved session(s)</p>', unsafe_allow_html=True)
        for i, s in enumerate(reversed(archive)):
            real_idx = len(archive) - 1 - i
            preview  = s["messages"][0]["content"][:95] + "…" if s["messages"] else ""
            col_card, col_v, col_c = st.columns([6, 1.1, 1.4])
            with col_card:
                st.markdown(
                    f'<div class="hist-card">'
                    f'<div class="hist-title">📄 {s["pdf"]}</div>'
                    f'<div class="hist-meta">{s["timestamp"]} · {s["count"]} Q&amp;As · {s["email"]}</div>'
                    f'<div class="hist-preview">"{preview}"</div>'
                    f'</div>',
                    unsafe_allow_html=True
                )
            with col_v:
                st.markdown("<div style='height:22px'></div>", unsafe_allow_html=True)
                if st.button("👁️", key=f"v_{real_idx}", use_container_width=True):
                    st.session_state.archived_idx = real_idx
                    st.session_state.view = "archived_view"
                    st.rerun()
            with col_c:
                st.markdown("<div style='height:22px'></div>", unsafe_allow_html=True)
                if st.button("▶️ Continue", key=f"c_{real_idx}", use_container_width=True):
                    st.session_state.messages = list(s["messages"])
                    st.session_state.chat_archive.pop(real_idx)
                    st.session_state.view = "chat"
                    st.rerun()


# ── ARCHIVED CHAT VIEW ────────────────────────────────────────────────────────
elif st.session_state.view == "archived_view":
    if st.button("← Back to History"):
        st.session_state.view = "history"
        st.rerun()

    idx = st.session_state.archived_idx
    s   = st.session_state.chat_archive[idx]

    st.markdown(
        f'<div class="arch-banner">📄 <b>{s["pdf"]}</b> &nbsp;·&nbsp; {s["timestamp"]} &nbsp;·&nbsp; {s["count"]} Q&amp;As (read-only)</div>',
        unsafe_allow_html=True
    )

    st.markdown('<div class="chat-outer">', unsafe_allow_html=True)
    render_messages(s["messages"])
    st.markdown('</div>', unsafe_allow_html=True)

    if st.button("▶️ Continue this chat", use_container_width=True):
        st.session_state.messages = list(s["messages"])
        st.session_state.chat_archive.pop(idx)
        st.session_state.archived_idx = None
        st.session_state.view = "chat"
        st.rerun()


# ── LIVE CHAT VIEW ────────────────────────────────────────────────────────────
else:
    if not st.session_state.pdf_name:
        # No-doc welcome screen
        st.markdown(
            '<div class="page-header">'
            '<div class="page-header-icon">💬</div>'
            f'<div class="page-header-title">Good day, {first_name}!</div>'
            '</div>',
            unsafe_allow_html=True
        )
        st.markdown(
            '<div class="empty-state">'
            '<span class="empty-icon">📂</span>'
            '<div class="empty-title">No document loaded</div>'
            '<div class="empty-sub">Upload a PDF using the sidebar panel on the left to start chatting with your document.</div>'
            '</div>',
            unsafe_allow_html=True
        )

        # Feature showcase when idle
        st.markdown("<div style='height:24px'></div>", unsafe_allow_html=True)
        c1, c2, c3 = st.columns(3)
        cards = [
            ("#EDE9FF","#5B21B6","#C4B5FD","🧠","Semantic Q&A","Ask anything — DocMind finds the exact answer from your document."),
            ("#E0F9F6","#0E7469","#67E8D8","⚡","Instant Answers","No waiting. Responses are generated in seconds using Groq's LPU."),
            ("#FFF7ED","#92400E","#FCD34D","💬","Chat History","All your sessions are saved. Resume any conversation anytime."),
        ]
        for col, (bg, tc, bc, icon, title, desc) in zip([c1,c2,c3], cards):
            with col:
                st.markdown(
                    f'<div style="background:{bg};border:1.5px solid {bc};border-radius:20px;'
                    f'padding:28px 24px;height:100%;">'
                    f'<div style="font-size:2rem;margin-bottom:14px;">{icon}</div>'
                    f'<div style="font-weight:800;color:{tc};font-size:1rem;margin-bottom:8px;">{title}</div>'
                    f'<div style="font-size:0.85rem;color:#6B6B99;line-height:1.65;">{desc}</div>'
                    f'</div>',
                    unsafe_allow_html=True
                )

    elif not st.session_state.messages:
        st.markdown(
            '<div class="page-header">'
            '<div class="page-header-icon">💬</div>'
            f'<div class="page-header-title">Ready to chat, {first_name}!</div>'
            '</div>',
            unsafe_allow_html=True
        )
        st.markdown(
            '<div class="empty-state">'
            '<span class="empty-icon">👋</span>'
            f'<div class="empty-title">Your document is loaded</div>'
            '<div class="empty-sub">Type your first question below and DocMind will answer based on the document content.</div>'
            '</div>',
            unsafe_allow_html=True
        )
    else:
        st.markdown(
            '<div class="page-header">'
            '<div class="page-header-icon">💬</div>'
            f'<div class="page-header-title">Chat</div>'
            '</div>',
            unsafe_allow_html=True
        )
        st.markdown('<div class="chat-outer">', unsafe_allow_html=True)
        render_messages(st.session_state.messages)
        st.markdown('</div>', unsafe_allow_html=True)

    # Input bar
    if st.session_state.pdf_name:
        def handle_submit():
            raw = st.session_state.get(f"qi_{st.session_state.input_counter}", "").strip()
            if not raw:
                return
            ts = datetime.datetime.now().strftime("%I:%M %p")
            st.session_state.messages.append({"role": "user", "content": raw, "ts": ts})
            with st.spinner("Thinking…"):
                answer = ask_llm_with_context(raw, st.session_state.chunks, st.session_state.messages[:-1])
            st.session_state.messages.append({
                "role": "assistant", "content": answer,
                "ts": datetime.datetime.now().strftime("%I:%M %p"),
            })
            st.session_state.input_counter += 1

        st.markdown("<div style='height:16px'></div>", unsafe_allow_html=True)
        ci, cb = st.columns([6, 1])
        with ci:
            st.text_input(
                "q", label_visibility="collapsed",
                placeholder="Ask anything about your document…  (Enter to send)",
                key=f"qi_{st.session_state.input_counter}",
                on_change=handle_submit,
            )
        with cb:
            if st.button("Send ➤", use_container_width=True):
                handle_submit()
                st.rerun()
        st.markdown(
            '<p class="input-hint">Powered by Groq LPU · DocMind AI · Responses based on document context only</p>',
            unsafe_allow_html=True
        )