import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './storefront.css';
import './commerce-enhancements.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  ),
  title: 'ZYRA — Independent Streetwear',
  description:
    'Original streetwear essentials, engineered in Karachi for life after hours.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'ZYRA — Built for After Hours',
    description: 'Independent streetwear. Karachi / 2026.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ZYRA — Built for After Hours',
    description: 'Independent streetwear. Karachi / 2026.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ZYRA',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    logo: '/og.png',
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'hello@zyra.store',
      contactType: 'customer support',
    },
  };
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
        />
      </body>
    </html>
  );
}
