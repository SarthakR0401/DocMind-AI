import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const secret = process.env.NEXTAUTH_SECRET || 'f63c8112c3f8e9185a676c5b76fc8df1';
    
    if (!authHeader || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { action, email, name, token } = body;
    
    if (!email || !name) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    const smtp_user = process.env.SMTP_USER;
    const smtp_pass = process.env.SMTP_PASS;
    const smtp_host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtp_port = parseInt(process.env.SMTP_PORT || '465', 10);
    
    if (!smtp_user || !smtp_pass) {
      console.warn("⚠️ SMTP credentials missing on Vercel. Skipping email.");
      return NextResponse.json({ error: 'SMTP config missing on Vercel' }, { status: 500 });
    }
    
    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: smtp_port,
      secure: smtp_port === 465,
      auth: {
        user: smtp_user,
        pass: smtp_pass,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    let subject = '';
    let html = '';
    
    if (action === 'reset') {
      const frontend_url = process.env.NEXTAUTH_URL || 'https://docminds-ai.vercel.app';
      const reset_link = `${frontend_url}?resetToken=${token}&resetEmail=${email}`;
      subject = "Reset Password Request - DocMind AI 🔒";
      html = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
              <h2 style="color: #7C3AED;">DocMind AI - Reset Password Request 🔒</h2>
              <p>Hi <strong>${name}</strong>,</p>
              <p>We received a request to reset the password for your DocMind AI account. Click the button below to establish a new password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${reset_link}" style="background-color: #7C3AED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
              </div>
              <p>If the button doesn't work, copy and paste the following link directly in your browser address bar:</p>
              <p style="word-break: break-all; color: #4F46E5;"><a href="${reset_link}">${reset_link}</a></p>
              <p><strong>Note:</strong> This link is only valid for 1 hour. If you did not make this request, you can safely ignore this email.</p>
              <p>Best regards,<br>The DocMind AI Team</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 0.8em; color: #777; text-align: center;">DocMind AI · Secure Document Assistant</p>
            </div>
          </body>
        </html>
      `;
    } else if (action === 'confirm') {
      subject = "Password Reset Successful - DocMind AI ✅";
      html = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
              <h2 style="color: #059669;">DocMind AI - Password Reset Successful ✅</h2>
              <p>Hi <strong>${name}</strong>,</p>
              <p>This is a confirmation email to notify you that the password for your DocMind AI account has been successfully updated.</p>
              <p>If you did not perform this action, please secure your account immediately or contact support.</p>
              <p>Best regards,<br>The DocMind AI Team</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 0.8em; color: #777; text-align: center;">DocMind AI · Secure Document Assistant</p>
            </div>
          </body>
        </html>
      `;
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    await transporter.sendMail({
      from: `"DocMind AI" <${smtp_user}>`,
      to: email,
      subject: subject,
      html: html,
    });
    
    return NextResponse.json({ message: 'Email sent successfully' });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
