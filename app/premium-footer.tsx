'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { Category } from '@/lib/catalog';
import type { StoreSettings } from '@/lib/supabase-store';

const socialPaths = {
  Instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12s.014 3.668.072 4.948c.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24s3.668-.014 4.948-.072c4.354-.2 6.782-2.618 6.979-6.98C23.986 15.668 24 15.259 24 12s-.014-3.667-.072-4.947c-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838A6.162 6.162 0 1 0 12 18.162 6.162 6.162 0 0 0 12 5.838zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z',
  Facebook: 'M24 12.073C24 5.446 18.627.073 12 .073S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  YouTube: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  TikTok: 'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-2.01-2.77V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 1 0 15.68 15.68V9.05a8.27 8.27 0 0 0 4.67 1.43V7.03a4.85 4.85 0 0 1-.76-.34z',
  WhatsApp: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12 24a11.94 11.94 0 0 1-5.045-1.12L1.36 24.35l1.49-5.45A11.94 11.94 0 1 1 12 24z',
};

export function PremiumFooter({ settings, collections }: { settings: StoreSettings; collections: Category[] }) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const groups = [
    { key: 'shop', title: 'Shop collections', links: [...collections.map((item) => ({ label: item.name, href: `/collections/${item.slug}` })), { label: 'Shop all', href: '/collections' }] },
    { key: 'help', title: 'Customer help', links: [{ label: 'Track your order', href: '/track-order' }, { label: 'Delivery information', href: '/pages/shipping' }, { label: 'Returns & size exchanges', href: '/pages/returns' }, { label: 'Sizing & shopping FAQs', href: '/pages/faq' }, { label: 'Fabric & care guide', href: '/pages/fabric-care' }, { label: 'Contact ZYRA', href: '/pages/contact' }] },
    { key: 'policies', title: 'Policies', links: [{ label: 'Terms of sale', href: '/pages/terms' }, { label: 'Privacy policy', href: '/pages/privacy' }, { label: 'Website terms', href: '/pages/website-terms' }] },
  ];
  const socials = [
    ['Instagram', settings.instagramUrl], ['Facebook', settings.facebookUrl], ['WhatsApp', settings.whatsappUrl],
  ].filter((entry): entry is [keyof typeof socialPaths, string] => Boolean(entry[1]));

  return <footer className="premium-footer" data-purpose="main-brand-footer">
    <div className="premium-footer-shell">
      <section className="premium-footer-intro">
        <div className="premium-footer-brand">
          <span>ZYRA<sup>®</sup></span>
          <p>Karachi / Est. 2023</p>
        </div>
        <div className="premium-footer-statement">
          <p className="eyebrow">Streetwear, done with intent</p>
          <h2>Wear what<br /><em>hits different.</em></h2>
          <p>Trend-led pieces. Quality fabric. Fits made for the version of you showing up today.</p>
        </div>
      </section>

      <section className="premium-footer-dispatch" data-purpose="newsletter-dispatch">
        <div><p className="eyebrow">The ZYRA feed</p><h3>New drops. No noise.</h3></div>
        <p>Fresh pieces, fit ideas and first looks—straight from our Instagram.</p>
        <a href={settings.instagramUrl || 'https://instagram.com'} target="_blank" rel="noreferrer">Follow ZYRA <ArrowRight /></a>
      </section>

      <section className="premium-footer-links" data-purpose="links-section">
        {groups.map((group, index) => <div className={`premium-footer-group ${openGroup === group.key ? 'is-open' : ''}`} key={group.key}>
          <button type="button" aria-expanded={openGroup === group.key} onClick={() => setOpenGroup(openGroup === group.key ? null : group.key)}>
            <span><small>0{index + 1}</small>{group.title}</span><i>+</i>
          </button>
          <h3><small>0{index + 1}</small>{group.title}</h3>
          <ul>{group.links.map((link) => <li key={link.label}><a href={link.href}>{link.label}<ArrowRight /></a></li>)}</ul>
        </div>)}
      </section>

      <section className="premium-footer-social" data-purpose="social-links">
        <div><p className="eyebrow">Stay in the loop</p><h3>New arrivals, outfit ideas and more.</h3></div>
        <div>{socials.map(([name, href]) => <a aria-label={name} href={href} target="_blank" rel="noreferrer" key={name}><svg fill="currentColor" viewBox="0 0 24 24"><path d={socialPaths[name]} /></svg><span>{name}</span></a>)}</div>
      </section>

      <div className="premium-footer-top"><button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to top <span>↑</span></button></div>

      <section className="premium-footer-legal" data-purpose="legal-bottom-bar">
        <p>© 2023 ZYRA · Karachi, PK</p><p>All rights reserved.</p>
      </section>
    </div>
  </footer>;
}
