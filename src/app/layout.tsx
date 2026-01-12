'use client'

import { Suspense } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectKitProvider } from 'connectkit'
import { config } from '@/config'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Toaster } from 'sonner';
import '@/app/globals.css'

const queryClient = new QueryClient()

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />

        {/* Favicon - SVG for modern browsers, PNG fallback for older browsers */}
        <link rel="icon" type="image/svg+xml" href="/zug_logo.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/zug_logo.svg" />
        <link rel="icon" type="image/png" sizes="16x16" href="/zug_logo.svg" />
        <link rel="apple-touch-icon" href="/zug_logo.svg" />
      </head>
      <body className="bg-[#020202] min-h-screen antialiased selection:bg-[#e2ff3d] selection:text-black">
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <ConnectKitProvider mode="dark">
              <div className="relative min-h-screen">
                {/* Global Institutional Atmosphere */}
                <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                  <div className="absolute inset-0 blueprint-grid opacity-[0.03]" />
                  <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] mix-blend-overlay" />

                </div>

                <div className="relative z-10 flex flex-col min-h-screen">
                  <Suspense fallback={<div className="h-16 bg-black" />}>
                    <Header />
                  </Suspense>
                  <main className="flex-grow pt-16 pb-12">
                    {children}
                  </main>
                  <Footer />
                </div>
              </div>
              <Toaster position="bottom-right" theme="dark" />
            </ConnectKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html >
  )
}
