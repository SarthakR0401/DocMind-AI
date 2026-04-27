"""
auth.py — OTP email authentication using Gmail SMTP (free, no API key needed).

Setup (one-time):
1. Go to https://myaccount.google.com/apppasswords
2. Select app: "Mail", device: "Other" → name it "DocMind"
3. Copy the 16-char app password (e.g. "abcd efgh ijkl mnop")
4. Fill SENDER_EMAIL and SENDER_APP_PASSWORD below.

Why App Password and not regular password?
- Google blocks direct SMTP login for regular passwords.
- App Passwords bypass this — they're made exactly for this use case.
- Your main Google password is never exposed.
"""

import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ── CONFIGURE THESE TWO LINES ─────────────────────────────────────────────────
SENDER_EMAIL        = "your_gmail@gmail.com"        # ← your Gmail address
SENDER_APP_PASSWORD = "xxxx xxxx xxxx xxxx"         # ← 16-char App Password
# ─────────────────────────────────────────────────────────────────────────────

OTP_EXPIRY_MINUTES = 10


def _generate_otp(length: int = 6) -> str:
    return str(random.randint(10 ** (length - 1), 10**length - 1))


def _build_email_html(otp: str, recipient: str) -> str:
    return f"""
    <html><body style="margin:0;padding:0;background:#f8f7f4;font-family:'Helvetica Neue',sans-serif;">
    <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:20px;
         box-shadow:0 4px 40px rgba(0,0,0,0.08);overflow:hidden;border:1px solid #ede9e2;">
      <div style="background:#1a1a2e;padding:28px 36px;">
        <div style="font-size:1.5rem;font-weight:700;color:#fff;letter-spacing:-0.02em;">
          🧠 Doc<span style="color:#e85d26">Mind</span>
        </div>
      </div>
      <div style="padding:36px;">
        <p style="font-size:1rem;color:#2d2d4e;margin-bottom:8px;">Hi there 👋</p>
        <p style="font-size:0.9rem;color:#5a5570;line-height:1.6;margin-bottom:28px;">
          Your one-time password for DocMind is below.<br>
          It expires in <b>{OTP_EXPIRY_MINUTES} minutes</b>.
        </p>
        <div style="background:#fef6f1;border:2px dashed #fad4c0;border-radius:14px;
             padding:24px;text-align:center;margin-bottom:28px;">
          <div style="font-size:2.4rem;font-weight:800;letter-spacing:0.18em;color:#e85d26;">
            {otp}
          </div>
        </div>
        <p style="font-size:0.8rem;color:#bbb;line-height:1.6;">
          If you didn't request this, you can safely ignore this email.<br>
          Never share this OTP with anyone.
        </p>
      </div>
      <div style="background:#f8f7f4;padding:16px 36px;font-size:0.75rem;color:#bbb;border-top:1px solid #ede9e2;">
        DocMind AI · Sent to {recipient}
      </div>
    </div>
    </body></html>
    """


def send_otp(recipient_email: str) -> tuple[bool, str]:
    """
    Send a 6-digit OTP to recipient_email via Gmail SMTP.

    Returns
    -------
    (True, otp_code)   on success
    (False, "")        on failure
    """
    otp = _generate_otp()

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Your DocMind OTP: {otp}"
    msg["From"]    = f"DocMind AI <{SENDER_EMAIL}>"
    msg["To"]      = recipient_email

    msg.attach(MIMEText(f"Your DocMind OTP is: {otp}. It expires in {OTP_EXPIRY_MINUTES} minutes.", "plain"))
    msg.attach(MIMEText(_build_email_html(otp, recipient_email), "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(SENDER_EMAIL, SENDER_APP_PASSWORD)
            server.sendmail(SENDER_EMAIL, recipient_email, msg.as_string())
        return True, otp
    except Exception as e:
        print(f"[DocMind auth] SMTP error: {e}")
        return False, ""


def verify_otp(user_input: str, stored_otp: str) -> bool:
    """Case-insensitive, strip-safe OTP comparison."""
    return user_input.strip() == stored_otp.strip()