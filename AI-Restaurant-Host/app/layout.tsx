import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { LanguageProvider } from '@/lib/language-context'
import { SEOScripts } from '@/components/seo-scripts'

export const metadata: Metadata = {
  title: 'The Golden Fork - AI Restaurant Host | Answer Every Call 24/7',
  description: 'Enhance your restaurant experience with The Golden Fork. Never miss a reservation. AI host handles reservations, answers questions, and grows your practice. HIPAA compliant. Start free trial.',
  keywords: 'restaurant AI host, restaurant reservation management, AI table booking, restaurant phone answering service, HIPAA compliant AI, restaurant automation, virtual restaurant host, 24/7 restaurant answering service',
  authors: [{ name: 'The Golden Fork' }],
  creator: 'Braunwell',
  publisher: 'Braunwell',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://thegoldenfork.ai',
    siteName: 'The Golden Fork',
    title: 'The Golden Fork - AI Restaurant Host | Answer Every Call 24/7',
    description: 'Enhance your restaurant experience with AI. Never miss a reservation. HIPAA compliant. Start free trial today.',
    images: [
      {
        url: 'https://thegoldenfork.ai/og-image.png',
        width: 1200,
        height: 630,
        alt: 'The Golden Fork - AI Dental Receptionist',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Golden Fork - AI Restaurant Host',
    description: 'Enhance your restaurant experience with AI. Never miss a reservation. HIPAA compliant.',
    images: ['https://thegoldenfork.ai/twitter-image.png'],
    creator: '@goldenforkAI',
  },
  alternates: {
    canonical: 'https://thegoldenfork.ai',
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  category: 'technology',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Additional SEO Meta Tags */}
        <meta name="application-name" content="The Golden Fork" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="The Golden Fork" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#F59E0B" />
      </head>
      <body className={`${GeistSans.className} ${GeistMono.variable}`}>
        <LanguageProvider>
          {children}
          <SEOScripts />
          <Analytics />
        </LanguageProvider>
      </body>
    </html>
  )
}