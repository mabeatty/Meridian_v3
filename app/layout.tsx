import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import '../styles/globals.css'
import { PWARegister } from './pwa'

export const metadata: Metadata = {
  title: 'Meridian',
  description: 'Personal life operating system',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Meridian" />
        <meta name="theme-color" content="#0a0a0a" />
      </head>
      <body className="bg-surface text-text-primary font-sans">
        <PWARegister />
        {children}
      </body>
    </html>
  )
}