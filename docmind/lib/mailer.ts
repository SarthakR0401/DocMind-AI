import nodemailer from 'nodemailer';

export const sendWelcomeEmail = async (to: string, name: string) => {
  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
          <h2 style="color: #7C3AED;">Welcome to DocMind AI! 🧠</h2>
          <p>Hi <strong>${name}</strong>,</p>
          <p>We're thrilled to have you join DocMind AI! Your account has been successfully created via Google Sign-In.</p>
          <p>With DocMind AI, you can:</p>
          <ul>
            <li>Upload any PDF document.</li>
            <li>Ask complex questions and get instant, context-aware answers.</li>
            <li>Analyze documents with the speed of Groq LPU technology.</li>
          </ul>
          <p>Ready to get started? Head over to your dashboard and upload your first document!</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL}" style="background-color: #7C3AED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Dashboard</a>
          </div>
          <p>If you have any questions, feel free to reply to this email.</p>
          <p>Best regards,<br>The DocMind AI Team</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 0.8em; color: #777; text-align: center;">DocMind AI · Powered by Next.js & Groq</p>
        </div>
      </body>
    </html>
  `;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const portEnv = process.env.SMTP_PORT;
  const username = process.env.SMTP_USER;
  const password = process.env.SMTP_PASS;

  if (!username || !password) {
    console.warn("⚠️ SMTP credentials missing. Skipping email.");
    return;
  }

  let sent = false;
  let lastError: any = null;

  // 1. If SMTP_PORT is explicitly specified, try it first
  if (portEnv) {
    const port = parseInt(portEnv, 10);
    const secure = port === 465;
    try {
      console.log(`Attempting to send email via SMTP on ${host}:${port} (secure: ${secure})...`);
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user: username,
          pass: password,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      await transporter.sendMail({
        from: `"DocMind AI" <${username}>`,
        to,
        subject: "Welcome to DocMind AI! 🧠",
        html,
      });
      console.log(`Welcome email sent to ${to} using configured port ${port}`);
      sent = true;
    } catch (error) {
      console.warn(`Configured SMTP sending on port ${port} failed:`, error);
      lastError = error;
    }
  }

  // 2. Cascade fallback through standard SMTP ports if not sent yet
  if (!sent) {
    // Try port 465 (SSL)
    try {
      console.log(`Attempting SMTP_SSL on ${host}:465...`);
      const transporter = nodemailer.createTransport({
        host,
        port: 465,
        secure: true,
        auth: {
          user: username,
          pass: password,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      await transporter.sendMail({
        from: `"DocMind AI" <${username}>`,
        to,
        subject: "Welcome to DocMind AI! 🧠",
        html,
      });
      console.log(`Welcome email sent to ${to} via fallback port 465`);
      sent = true;
    } catch (error) {
      console.warn(`SMTP_SSL on port 465 failed:`, error);
      lastError = error;
    }

    // Try port 587 (STARTTLS)
    if (!sent) {
      try {
        console.log(`Attempting SMTP STARTTLS on ${host}:587...`);
        const transporter = nodemailer.createTransport({
          host,
          port: 587,
          secure: false, // false for STARTTLS
          auth: {
            user: username,
            pass: password,
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        await transporter.sendMail({
          from: `"DocMind AI" <${username}>`,
          to,
          subject: "Welcome to DocMind AI! 🧠",
          html,
        });
        console.log(`Welcome email sent to ${to} via fallback port 587`);
        sent = true;
      } catch (error) {
        console.error(`SMTP STARTTLS on port 587 failed:`, error);
        lastError = error;
      }
    }
  }

  if (!sent) {
    console.error("Error sending welcome email (all methods failed):", lastError);
  }
};
