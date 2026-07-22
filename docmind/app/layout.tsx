import type { Metadata } from 'next'
import { Playfair_Display, Outfit, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Analytics } from '@vercel/analytics/react'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '600', '700', '800'],
  style: ['normal', 'italic'],
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  weight: ['400', '500'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'DocMind AI — Chat with your PDFs',
  description: 'Transform any PDF into an interactive conversation. Ask questions, extract insights, and understand complex documents instantly.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${outfit.variable} ${jetbrains.variable}`}>
      <body className="font-body antialiased bg-[#F8F6FF] text-[#0F0A1E]">
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
