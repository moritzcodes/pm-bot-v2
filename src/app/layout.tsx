import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { initializeDatabase } from '@/lib/db-init'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PM Bot -- BOB",
  description: "AI with Next and AI SDK",
};

// Initialize database on server start
if (process.env.NODE_ENV === 'development') {
  initializeDatabase()
    .catch(console.error)
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header />
        <main className="bg-muted/50 flex h-100vh flex-1 flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}