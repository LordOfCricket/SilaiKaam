import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { env } from '@/config/env';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600'],
  display: 'swap',
});

// NEXT_PUBLIC_SITE_URL must be set to the real SilaiKaam domain in production
// (see .env.local.example) — this falls back to a local dev URL otherwise.
const siteUrl = env.NEXT_PUBLIC_SITE_URL;
const title = 'SilaiKaam — Perfect Fit. Made Personal.';
const description =
  'SilaiKaam brings Indian tailoring craftsmanship to modern fashion — discover clothing or bring your own, and have it measured and fitted to you.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: '%s — SilaiKaam',
  },
  description,
  keywords: [
    'tailoring',
    'custom fit clothing',
    'made to measure',
    'Indian craftsmanship',
    'fitting',
    'clothing marketplace',
    'garment alterations',
  ],
  alternates: {
    canonical: '/',
  },
  // No `images` set here: the repo has no social preview asset yet (public/ is
  // empty). Add a real one and an `images` entry before launch — an og:image
  // is required for rich link previews on social/chat platforms.
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'SilaiKaam',
    title,
    description,
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
