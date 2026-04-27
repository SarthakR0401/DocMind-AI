import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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

  try {
    await transporter.sendMail({
      from: `"DocMind AI" <${process.env.SMTP_USER}>`,
      to,
      subject: "Welcome to DocMind AI! 🧠",
      html,
    });
    console.log(`Welcome email sent to ${to}`);
  } catch (error) {
    console.error("Error sending welcome email:", error);
  }
};
