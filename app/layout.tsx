import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './storefront.css';
import './collection-discovery.css';
import './brand-polish.css';
import './customer-help.css';
import './order-tracking.css';
import './commerce-enhancements.css';
import './product-detail.css';
import './visitor-activity.css';
import './checkout-polish.css';
import './payment-setup.css';
import { ActivityConsent } from './visitor-activity';
import { absoluteUrl, siteOrigin, serializeSchema } from '@/lib/seo';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    siteOrigin(),
  ),
  title: 'ZYRA — Independent Streetwear',
  description:
    'Original streetwear essentials, engineered in Karachi for life after hours.',
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
  verification: {
    google: '68PKPCYHS7FaeLxtNrEUnMhwzdbrSTJfe3JGyCXdJ3U',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': absoluteUrl('/#organization'),
    name: 'ZYRA',
    url: absoluteUrl('/'),
    logo: absoluteUrl('/og.png'),
  };
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
        <ActivityConsent />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeSchema([organization, { '@context': 'https://schema.org', '@type': 'WebSite', name: 'ZYRA', url: absoluteUrl('/'), inLanguage: 'en-PK' }]) }}
        />
      </body>
    </html>
  );
}
