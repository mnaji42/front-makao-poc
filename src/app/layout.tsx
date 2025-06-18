"use client"

import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { useState } from "react"
import Header from "@/components/Header"
import { NotificationProvider } from "../contexts/NotificationContext"
import { NotificationContainer } from "../components/notifications"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider } from "wagmi"
import { config } from "../lib/wagmi"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  )

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>
          <div className="min-h-screen bg-gray-900 text-gray-100 relative overflow-hidden">
            {/* Subtle background */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,120,120,0.03),transparent_50%)]" />
            </div>

            <div className="relative z-10 container mx-auto px-4 py-8">
              <Header />
              {children}
            </div>

            {/* Conteneur de notifications */}
            <NotificationContainer />
          </div>
        </NotificationProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
