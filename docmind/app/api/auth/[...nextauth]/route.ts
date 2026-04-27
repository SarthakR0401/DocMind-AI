import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import fs from "fs"
import path from "path"

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
        // Resolve path to the root 'genai-support-assistant' directory
        const logFile = path.join(process.cwd(), "..", "login_records.csv");
        
        // Add CSV header if this is the first login ever recorded
        if (!fs.existsSync(logFile)) {
          fs.writeFileSync(logFile, "Timestamp,Email,Name,Provider\n");
        }
        
        // Append user to file
        const timestamp = new Date().toLocaleString();
        const email = user?.email || "unknown";
        const name = user?.name || "unknown";
        const provider = account?.provider || "unknown";
        
        const logLine = `"${timestamp}","${email}","${name}","${provider}"\n`;
        fs.appendFileSync(logFile, logLine);
      } catch (error) {
        console.error("Failed to log user sign-in:", error);
      }
    }
  }
})

export { handler as GET, handler as POST }
