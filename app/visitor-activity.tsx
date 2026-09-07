'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export function trackActivity(action: 'page_view' | 'add_to_bag' | 'checkout_view', path: string) {
  try {
    if (process.env.NODE_ENV === 'production' || localStorage.getItem('zyra-analytics-choice') === 'decline' || navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
    void fetch('/api/visitor-activity', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, path }) }).catch(() => {});
  } catch { /* Shopping remains available when storage is disabled. */ }
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
  return <section><h2>Your analytics preference</h2><p>You can turn off activity analytics for this browser at any time. We also respect Do Not Track and Global Privacy Control. Previous opt-outs remain in effect.</p><button className="outline-button" disabled={disabled === null} onClick={() => { try { localStorage.setItem('zyra-analytics-choice', disabled ? 'allow' : 'decline'); setDisabled(!disabled); setMessage(disabled ? 'Analytics enabled, subject to your browser privacy settings.' : 'Analytics disabled for this browser.'); } catch { setMessage('The preference could not be saved in this browser.'); } }}>{disabled ? 'Enable analytics' : 'Turn off analytics'}</button><p role="status">{message}</p></section>;
}

type Data = { summary: { visitors: number; views: number; bagAdds: number; checkouts: number }; visitors: { visitor: string; firstSeen: number; lastSeen: number; events: number; device: string }[]; events: { visitor: string; action: string; path: string; created: number }[] };
const labels: Record<string, string> = { page_view: 'Viewed page', add_to_bag: 'Added to bag', checkout_view: 'Opened checkout' };
export function VisitorDashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');
  const load = async () => { try { const response = await fetch('/api/visitor-activity', { cache: 'no-store' }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setData(result); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load activity.'); } };
  useEffect(() => { void load(); const timer = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 15000); return () => clearInterval(timer); }, []);
  return <section className="visitor-dashboard"><div className="admin-section-head"><div><h2>Visitor activity</h2><p>Last 30 days · recorded visits · refreshes every 15 seconds</p></div><button className="outline-button" onClick={() => void load()}>Refresh</button></div>
    <p>Local tracking. IP: local / unavailable. Admin visits are excluded. Counts are browser activity, not confirmed sales or unique people.</p>
    {error && <p role="alert">{error}</p>}{!data && !error && <p>Loading activity…</p>}
    {data && <><div className="stat-grid">{(['visitors', 'views', 'bagAdds', 'checkouts'] as const).map((key, i) => <div key={key}><small>{['Visitor sessions', 'Page views', 'Bag additions', 'Checkout visits'][i]}</small><b>{data.summary[key] || 0}</b></div>)}</div>
    {!data.visitors.length ? <p className="visitor-empty">No recorded visits yet. Open the store in a private browser window to test a customer visit. Browser privacy settings and saved opt-outs are respected.</p> : <div className="visitor-columns"><div className="visitor-list"><h3>Recent visitors</h3>{data.visitors.map(v => <button key={v.visitor} className={selected === v.visitor ? 'selected' : ''} onClick={() => setSelected(v.visitor)}><b>Visitor {v.visitor.slice(0, 8)}</b><span>{v.device} · {v.events} activities</span><small>Last seen {new Date(v.lastSeen).toLocaleString()}</small></button>)}</div><div><h3>{selected ? `Visitor ${selected.slice(0, 8)}` : 'Recent activity'}</h3>{selected && <button onClick={() => setSelected('')}>Show all visitors</button>}<p>Showing the latest 1,000 recorded events.</p><ol className="visitor-timeline">{data.events.filter(e => !selected || e.visitor === selected).map((e, i) => <li key={`${e.created}-${i}`}><b>{labels[e.action] || e.action}</b><span>{e.path}</span><small>{new Date(e.created).toLocaleString()} · {e.visitor.slice(0, 8)}</small></li>)}</ol></div></div>}</>}
  </section>;
}
