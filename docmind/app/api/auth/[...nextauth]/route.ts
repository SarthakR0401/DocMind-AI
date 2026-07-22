import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import fs from "fs"
import path from "path"
import { sendWelcomeEmail } from "@/lib/mailer"

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  pages: {
    signIn: "/",
  },
  events: {
    async signIn({ user, account }) {
      try {
        const logFile = path.join(process.cwd(), "..", "login_records.csv");
        const email = user?.email || "unknown";
        const name = user?.name || "unknown";
        const provider = account?.provider || "unknown";
        const timestamp = new Date().toLocaleString();

        let isFirstLogin = false;

        // Ensure file exists
        if (!fs.existsSync(logFile)) {
          fs.writeFileSync(logFile, "Timestamp,Email,Name,Provider\n");
          isFirstLogin = true;
        } else {
          // Check if email already exists in the records
          const content = fs.readFileSync(logFile, "utf-8");
          if (!content.includes(email)) {
            isFirstLogin = true;
          }
        }

        // If it's the first time we see this email, send the welcome email
        if (isFirstLogin && email !== "unknown") {
          await sendWelcomeEmail(email, name);
        }

        // Log the sign-in event
        const logLine = `"${timestamp}","${email}","${name}","${provider}"\n`;
        fs.appendFileSync(logFile, logLine);

        // Notify Python backend to log the login in the database
        const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const apiUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
        
        if (email !== "unknown") {
          await fetch(`${apiUrl}/api/analytics/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name, provider })
          }).catch(err => {
            console.error("Failed to notify backend of OAuth login:", err);
          });
        }
      } catch (error) {
        console.error("Failed to process user sign-in:", error);
      }
    }
  }
})

export { handler as GET, handler as POST }
