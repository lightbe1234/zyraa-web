import type { Metadata } from 'next';
import { Geist_Mono, Manrope, Space_Grotesk } from 'next/font/google';
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
import './custom-shirt-studio.css';
import './typography-polish.css';
import './category-pages.css';
import './order-confirmation.css';
import './premium-footer.css';
import './admin-checkout-responsive.css';
import './premium-buttons.css';
import './reviews-polish.css';
import { ActivityConsent } from './visitor-activity';
import { absoluteUrl, siteOrigin, serializeSchema } from '@/lib/seo';

const manrope = Manrope({ variable: '--font-body', subsets: ['latin'], display: 'swap' });
const spaceGrotesk = Space_Grotesk({ variable: '--font-display', subsets: ['latin'], display: 'swap' });
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
      <body className={`${manrope.variable} ${spaceGrotesk.variable} ${geistMono.variable}`}>
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
