'use client';
import { useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Check, ChevronDown, Clock3, CreditCard, MapPin, Package, PackageCheck, RefreshCw, ShieldCheck, Truck } from 'lucide-react';
import { money, type Product } from '@/lib/catalog';
import type { StoreOrder } from '@/lib/supabase-store';

const stages = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'];
const labels: Record<string, string> = { PENDING: 'Order received', CONFIRMED: 'Confirmed', PROCESSING: 'Preparing your order', PACKED: 'Packed & ready', SHIPPED: 'Handed to courier', DELIVERED: 'Delivered', CANCELLED: 'Order cancelled', RETURN_REQUESTED: 'Return requested', RETURNED: 'Returned' };
const messages: Record<string, string> = {
  PENDING: 'Your order is recorded and awaiting confirmation.', CONFIRMED: 'Your order is confirmed. Preparation is the next step.',
  PROCESSING: 'Your pieces are being prepared for dispatch.', PACKED: 'Your parcel is packed. Courier handover is the next step.',
  SHIPPED: 'Your order has been marked as shipped. Contact us for the courier reference or a delivery update.',
  DELIVERED: 'Your order has been marked as delivered. We hope you love your new pieces.',
  CANCELLED: 'This order is cancelled. Contact us if you have a payment or refund question.',
  RETURN_REQUESTED: 'A return has been requested. Please follow the instructions from our support team.',
  RETURNED: 'Your order has been marked as returned. Contact us for the replacement or refund status.',
};
export function OrderTracking({ catalog }: { catalog: Product[] }) {
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [checked, setChecked] = useState('');
  const form = useRef<HTMLFormElement>(null);
  const result = useRef<HTMLElement>(null);
  const pending = useRef(false);
  const lookup = async (event?: FormEvent) => {
    event?.preventDefault();
    if (pending.current || !form.current?.reportValidity()) return;
    pending.current = true; setBusy(true); setError(''); setOrder(null);
    const data = new FormData(form.current);
    const query = new URLSearchParams({ number: String(data.get('number') || '').trim(), contact: String(data.get('contact') || '').trim() });
    try {
      const response = await fetch(`/api/orders?${query}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(response.status === 404 ? 'No matching order found. Check the order number and the email or phone you used at checkout.' : response.status === 429 ? 'Too many attempts. Please wait a few minutes before checking again.' : 'Order updates are temporarily unavailable. Please try again shortly.');
      const data: StoreOrder = await response.json();
      setOrder(data); setChecked(new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }));
      requestAnimationFrame(() => result.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }));
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { pending.current = false; setBusy(false); }
  };
  const current = order ? stages.indexOf(order.status) : -1;
  return <main className="logistics-page">
    <nav className="logistics-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><span aria-current="page">Track your order</span></nav>
    <header className="logistics-hero"><div><p className="eyebrow">ZYRA / Delivery desk</p><h1>Your order.<br /><em>Every next step.</em></h1><p>From confirmation to delivery. Find your latest order update in one place.</p><div className="logistics-hero-note"><ShieldCheck />Your order details stay between you and us.</div></div><div className="logistics-lookup"><div className="logistics-form-heading"><Package /><h2>Find your parcel</h2></div><form ref={form} onSubmit={lookup}><label>Order number<input name="number" required maxLength={100} placeholder="e.g. ZY-260903-XXXX" autoComplete="off" /></label><label>Checkout email or phone<input name="contact" required maxLength={160} placeholder="The contact used for this order" autoComplete="off" /></label><button disabled={busy} type="submit">{busy ? 'Checking your order…' : 'Track my order'}{busy ? <RefreshCw className="logistics-spin" /> : <ArrowRight />}</button>{error && <p className="logistics-error" role="alert">{error}</p>}</form><p>Find your order number in your order confirmation. <a href="/pages/contact">Need help?</a></p></div></header>
    <div className="logistics-reassurance"><span><PackageCheck />Order status</span><span><CreditCard />Payment summary</span><span><MapPin />Delivery details</span></div>
    <div role="status" className="sr-only">{busy ? 'Loading order details' : order ? `Order found: ${labels[order.status] || order.status}` : ''}</div>
    {order && <section ref={result} className="logistics-result" aria-label="Your order tracking result"><header><div><p className="eyebrow">Order {order.number}</p><h2>{labels[order.status] || 'Order update'}</h2><p>{messages[order.status] || 'Contact ZYRA for help with this order’s current status.'}</p></div><div className="logistics-updated"><span><Clock3 />Checked at {checked}</span><button type="button" disabled={busy} onClick={() => void lookup()}><RefreshCw />Refresh status</button></div></header>
      {current >= 0 ? <ol className="logistics-timeline" aria-label="Order progress">{stages.map((stage, index) => <li key={stage} className={index < current ? 'is-complete' : index === current ? 'is-current' : ''} aria-current={index === current ? 'step' : undefined}><i>{index < current ? <Check /> : String(index + 1).padStart(2, '0')}</i><b>{labels[stage]}</b><small>{index < current ? 'Completed' : index === current ? 'Current status' : 'Next stage'}</small></li>)}</ol> : <div className="logistics-exception"><PackageCheck /><p>This order is outside the standard delivery flow. <a href="/pages/contact">Contact us for the next step.</a></p></div>}
      <div className="logistics-result-grid"><section className="logistics-items"><h3>Inside your order <span>{order.items.reduce((sum, item) => sum + item.qty, 0)} pieces</span></h3>{order.items.map((item, index) => { const product = catalog.find(product => product.slug === item.slug); return <article key={`${item.slug}-${index}`}>{product?.image ? <img src={product.image} alt="" /> : <div className="logistics-item-fallback"><Package /></div>}<div><b>{product?.name || item.slug.replaceAll('-', ' ')}</b><p>{item.color} · Size {item.size}</p><small>Qty {item.qty} · {money(item.unitPrice)} each</small></div><strong>{money(item.lineTotal)}</strong></article>; })}<dl><div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div><div><dt>Delivery</dt><dd>{order.shipping ? money(order.shipping) : 'Free'}</dd></div><div><dt>Order total</dt><dd>{money(order.total)}</dd></div></dl></section><aside className="logistics-facts"><section><MapPin /><h3>Delivery destination</h3><p>{order.delivery.city}, {order.delivery.province}</p><small>Need to correct your address? Contact us as soon as possible, before dispatch.</small></section><section><CreditCard /><h3>Payment</h3><p>{order.payment === 'cod' ? 'Cash on delivery' : order.payment === 'bank' ? 'Bank transfer' : 'Online payment'}</p><small>Status: {(order.paymentStatus || 'Not available').replaceAll('_', ' ').toLowerCase()}</small></section><section><Truck /><h3>Courier updates</h3><p>{order.status === 'SHIPPED' || order.status === 'DELIVERED' ? 'Ask us for the courier reference.' : 'Courier details follow dispatch.'}</p><small>This page shows ZYRA order status. Courier scan events and an arrival estimate are not yet available here.</small></section></aside></div>
    </section>}
    <section className="logistics-journey"><header><p className="eyebrow">The delivery journey</p><h2>From your bag.<br />To your doorstep.</h2><p>A clear process, with help at every stage.</p></header><div>{[[PackageCheck, '01', 'Order confirmed', 'We check your order and any required payment confirmation.'], [Package, '02', 'Prepared & packed', 'Your pieces are prepared for courier handover.'], [Truck, '03', 'On its way', 'Once dispatched, check your order here or ask us for a courier update.']].map(([Icon, number, title, copy]) => { const StepIcon = Icon as typeof Truck; return <article key={String(number)}><span>{String(number)}</span><StepIcon /><h3>{String(title)}</h3><p>{String(copy)}</p></article>; })}</div></section>
    <section className="logistics-partners"><div><p className="eyebrow">Our delivery partners</p><h2>Across Pakistan.</h2><p>Courier selection depends on your address and service availability.</p></div><div>{['TCS', 'Protex', 'Leopards', 'M&P', 'Trax'].map(name => <span key={name}>{name}</span>)}</div></section>
    <section className="logistics-support"><header><p className="eyebrow">Good to know</p><h2>A smoother delivery starts here.</h2></header><div className="logistics-faqs">{[['When will my order arrive?', 'Timing depends on your city, dispatch and courier coverage. Contact us for an estimate if you need your order by a particular date. We do not show an arrival date until it is confirmed.'], ['Missed a delivery or need to change the address?', 'Contact ZYRA with your order number. Address changes are easiest before dispatch. Once a parcel is with the courier, we will help you check the available options.'], ['Can I open the parcel?', 'Confirm open-parcel availability with us before dispatch. It depends on the courier service booked. Follow the rider’s inspection instructions.'], ['Marked delivered, but not received?', 'Check with someone at your delivery address, then contact ZYRA promptly with your order number so we can investigate with the courier.'], ['Need another size?', 'Request a size exchange within 7 calendar days of delivery. Keep the item unworn, unwashed and with its tags. See the exchange policy for costs and instructions.']].map(([title, copy]) => <details key={title}><summary>{title}<ChevronDown /></summary><p>{copy}</p></details>)}</div></section>
    <section className="logistics-contact"><div><p className="eyebrow">People, not just parcels.</p><h2>Need a hand with your delivery?</h2><p>Have your order number ready. We’ll help with the next step.</p></div><a href="/pages/contact">Contact ZYRA <ArrowRight /></a></section><nav className="logistics-policy-links" aria-label="Delivery help"><a href="/pages/shipping">Delivery information <ArrowRight /></a><a href="/pages/returns">7-day size exchange <ArrowRight /></a><a href="/pages/privacy">Your privacy <ArrowRight /></a></nav>
  </main>;
}
