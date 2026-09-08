'use client';
import { useEffect, useState } from 'react';
type Setup = { ready: boolean; environment: string; webhook: string; checks: { label: string; ready: boolean }[] };
export function PaymentSetup() {
  const [setup,setSetup] = useState<Setup | null>(null);
  const [error,setError] = useState('');
  const load = async () => { try { const response = await fetch('/api/admin/payment-setup', { cache: 'no-store' }); if (!response.ok) throw new Error(); setSetup(await response.json()); setError(''); } catch { setError('Could not load payment setup. Try again.'); } };
  useEffect(() => { void load(); }, []);
  return <section className="payment-setup"><div className="admin-section-head"><div><h2>Safepay · advance payments</h2><p>Full order payment by debit or credit card.</p></div><button className="outline-button" onClick={() => void load()}>Check setup</button></div>{error && <p role="alert">{error}</p>}
    {!setup && !error && <p>Checking configuration…</p>}{setup && <><p className="payment-setup-status">{setup.ready ? `Configuration ready · ${setup.environment}. Complete a test payment before accepting live orders.` : 'Not active — the missing items below are required before card payments can work.'}</p><ul className="payment-checks">{setup.checks.map(item => <li key={item.label}><span>{item.label}</span><b>{item.ready ? 'Configured' : 'Missing'}</b></li>)}</ul>{setup.webhook && <p>Webhook endpoint: <code>{setup.webhook}</code></p>}</>}
    <h3>Activate your account</h3><ol><li>Create a <a href="https://safepay.pk/signup" target="_blank" rel="noreferrer">Safepay account</a> and complete merchant onboarding, business verification and settlement bank details.</li><li>For testing, use sandbox keys from Developers → API and the shared secret from Developers → Endpoints.</li><li>Add credentials to the server’s environment settings, apply the payment migration to a test database, and register the webhook endpoint for payment.succeeded v2.0.0.</li><li>Run a sandbox payment and verify the order becomes Paid. After Safepay approves your merchant account, switch to production credentials and repeat the launch checks.</li></ol>
    <p>Localhost needs a public HTTPS tunnel to receive Safepay callbacks. Secret keys never belong in product content or frontend code.</p><h3>How the payment works</h3><p>Customer selects advance payment → order total is calculated on the server → Safepay collects card payment → a verified callback marks the order Paid → Safepay settles funds to your approved bank account under your merchant agreement.</p>
  </section>;
}
