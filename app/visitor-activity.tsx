'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-VRVLEF7HSN';
type Gtag = (...args: unknown[]) => void;
function allowed() {
  try { return localStorage.getItem('zyra-analytics-choice') !== 'decline' && navigator.doNotTrack !== '1' && !(navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl; }
  catch { return false; }
}
function gtag() {
  if (!allowed()) return undefined;
  const win = window as typeof window & { dataLayer?: unknown[][]; gtag?: Gtag };
  win.dataLayer ||= [];
  win.gtag ||= (...args: unknown[]) => { win.dataLayer!.push(args); };
  if (!document.getElementById('zyra-google-analytics')) {
    const script = document.createElement('script'); script.id = 'zyra-google-analytics'; script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`; document.head.appendChild(script);
    win.gtag('js', new Date()); win.gtag('config', gaId, { send_page_view: false, anonymize_ip: true });
  }
  return win.gtag;
}

export function trackActivity(action: 'page_view' | 'add_to_bag' | 'checkout_view', path: string) {
  try {
    if (localStorage.getItem('zyra-analytics-choice') === 'decline' || navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
    void fetch('/api/visitor-activity', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, path }) }).catch(() => {});
    const send = gtag();
    if (action === 'page_view') send?.('event', 'page_view', { page_path: path, page_location: location.href, page_title: document.title });
    if (action === 'add_to_bag') send?.('event', 'add_to_cart', { currency: 'PKR', items: [{ item_id: path.split('/').pop() }] });
    if (action === 'checkout_view') send?.('event', 'begin_checkout', { currency: 'PKR' });
  } catch { /* Shopping remains available when storage is disabled. */ }
}

export function trackPurchase(order: { number: string; total: number; shipping: number; items: Array<{ slug: string; qty: number; unitPrice: number }> }) {
  try { gtag()?.('event', 'purchase', { transaction_id: order.number, value: order.total / 100, shipping: order.shipping / 100, currency: 'PKR', items: order.items.map(item => ({ item_id: item.slug, item_name: item.slug.replaceAll('-', ' '), price: item.unitPrice / 100, quantity: item.qty })) }); }
  catch { /* Order completion must not depend on analytics. */ }
}

export function ActivityConsent() {
  const path = usePathname();
  useEffect(() => { if (!path.startsWith('/admin')) trackActivity(path === '/checkout' ? 'checkout_view' : 'page_view', path); }, [path]);
  return null;
}

export function ActivityPrivacySetting() {
  const [disabled, setDisabled] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => { try { setDisabled(localStorage.getItem('zyra-analytics-choice') === 'decline'); } catch { setMessage('Your browser has blocked preference storage.'); } }, []);
  return <section><h2>Your analytics preference</h2><p>You can turn off activity analytics for this browser at any time. We also respect Do Not Track and Global Privacy Control. Previous opt-outs remain in effect.</p><button className="outline-button" disabled={disabled === null} onClick={() => { try { localStorage.setItem('zyra-analytics-choice', disabled ? 'allow' : 'decline'); setDisabled(!disabled); window.dispatchEvent(new Event('zyra-analytics-change')); setMessage(disabled ? 'Analytics enabled, subject to your browser privacy settings.' : 'Analytics disabled for this browser.'); } catch { setMessage('The preference could not be saved in this browser.'); } }}>{disabled ? 'Enable analytics' : 'Turn off analytics'}</button><p role="status">{message}</p></section>;
}

type Data = { summary: { visitors: number; views: number; bagAdds: number; checkouts: number }; visitors: { visitor: string; firstSeen: number; lastSeen: number; events: number; device: string }[]; events: { visitor: string; action: string; path: string; created: number }[] };
const labels: Record<string, string> = { page_view: 'Viewed page', add_to_bag: 'Added to bag', checkout_view: 'Opened checkout' };
export function VisitorDashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');
  const [mode, setMode] = useState('customers');
  const [diagnostic, setDiagnostic] = useState('Checking browser preferences…');
  const load = async () => { try { const response = await fetch(`/api/visitor-activity?mode=${mode}`, { cache: 'no-store' }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setData(result); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load activity.'); } };
  useEffect(() => { setData(null); setSelected(''); void load(); const timer = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 15000); return () => clearInterval(timer); }, [mode]);
  useEffect(() => { try { setDiagnostic(navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl ? 'This browser requests no tracking (Do Not Track / Global Privacy Control).' : localStorage.getItem('zyra-analytics-choice') === 'decline' ? 'Analytics is turned off in this browser. You can change it on the Privacy Policy page.' : 'This browser allows analytics. Because you are signed in as admin, store visits appear under Admin preview.'); } catch { setDiagnostic('Browser storage is blocked, so activity collection is unavailable in this browser.'); } }, []);
  return <section className="visitor-dashboard"><div className="admin-section-head"><div><h2>Visitor activity</h2><p>Last 30 days · recorded visits · refreshes every 15 seconds</p></div><button className="outline-button" onClick={() => void load()}>Refresh</button></div>
    <div className="visitor-mode" role="group" aria-label="Activity source"><button aria-pressed={mode === 'customers'} onClick={() => setMode('customers')}>Customers</button><button aria-pressed={mode === 'preview'} onClick={() => setMode('preview')}>Admin preview</button><a className="inline-link" href="/" target="_blank" rel="noreferrer">Open store to test ↗</a></div>
    <p>{diagnostic} <a href="/pages/privacy" target="_blank" rel="noreferrer">Privacy preferences</a></p>
    <p>{mode === 'preview' ? 'Admin preview only — these visits are excluded from customer totals.' : 'Customer activity only. No previous browsing history is backfilled.'} Secure database · 30-day retention · no raw IP stored.</p>
    {error && <p role="alert">{error}</p>}{!data && !error && <p>Loading activity…</p>}
    {data && <><div className="stat-grid">{(['visitors', 'views', 'bagAdds', 'checkouts'] as const).map((key, i) => <div key={key}><small>{['Visitor sessions', 'Page views', 'Bag additions', 'Checkout visits'][i]}</small><b>{data.summary[key] || 0}</b></div>)}</div>
    {!data.visitors.length ? <p className="visitor-empty">No recorded visits yet. Open the store in a private browser window to test a customer visit. Browser privacy settings and saved opt-outs are respected.</p> : <div className="visitor-columns"><div className="visitor-list"><h3>Recent visitors</h3>{data.visitors.map(v => <button key={v.visitor} className={selected === v.visitor ? 'selected' : ''} onClick={() => setSelected(v.visitor)}><b>Visitor {v.visitor.slice(0, 8)}</b><span>{v.device} · {v.events} activities</span><small>Last seen {new Date(v.lastSeen).toLocaleString()}</small></button>)}</div><div><h3>{selected ? `Visitor ${selected.slice(0, 8)}` : 'Recent activity'}</h3>{selected && <button onClick={() => setSelected('')}>Show all visitors</button>}<p>Showing the latest 1,000 recorded events.</p><ol className="visitor-timeline">{data.events.filter(e => !selected || e.visitor === selected).map((e, i) => <li key={`${e.created}-${i}`}><b>{labels[e.action] || e.action}</b><span>{e.path}</span><small>{new Date(e.created).toLocaleString()} · {e.visitor.slice(0, 8)}</small></li>)}</ol></div></div>}</>}
  </section>;
}
