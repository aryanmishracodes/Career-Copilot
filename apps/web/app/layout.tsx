import './globals.css'
import type { Metadata } from 'next'
import { Inter, Outfit } from 'next/font/google'
import { AuthProvider } from '../contexts/AuthContext'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-display' })

export const metadata: Metadata = {
  title: 'Career Copilot',
  description: 'AI-Powered Career Intelligence Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${outfit.variable} font-sans bg-[#030303] text-zinc-100 antialiased min-h-screen relative`}>
        {/* Global Cinematic Ambient Background */}
        <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none bg-[#030303]">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-950/20 blur-[120px] opacity-60" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-violet-950/15 blur-[150px] opacity-50" />
          <div className="absolute top-[30%] right-[20%] w-[40%] h-[40%] rounded-full bg-cyan-950/10 blur-[130px] opacity-40" />
        </div>

        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
