'use client';
import { useEffect, useState } from 'react';
export default function PaymentReturn() {
  const [state,setState] = useState('Checking your payment…');
  const [token,setToken] = useState('');
  const [pending,setPending] = useState(false);
  const [busy,setBusy] = useState(false);
  useEffect(() => {
    const value = new URLSearchParams(location.search).get('order') || '';
    setToken(value);
    if (!value) { setState('Order reference is missing. Contact us before making another payment.'); return; }
    let stopped=false, attempts=0;
    const check = async () => {
      try {
        const response=await fetch(`/api/orders?token=${encodeURIComponent(value)}`,{cache:'no-store'});
        if (!response.ok) throw new Error();
        const order=await response.json();
        if (stopped) return;
        if (order.paymentStatus === 'PAID') {
          setState('Payment received. Thank you!');
          try {
            const key = `zyra-paid-cart-${value}`;
            if (!sessionStorage.getItem(key)) {
              const cart = JSON.parse(localStorage.getItem('zyra-cart') || '[]') as Array<{slug:string;size:string;color:string;qty:number}>;
              const selection = (items: typeof cart) => JSON.stringify(items.map(({slug,size,color,qty}) => ({slug,size,color,qty})).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
              if (selection(cart) === selection(order.items)) localStorage.removeItem('zyra-cart');
              sessionStorage.setItem(key,'1');
            }
          } catch { /* Order remains paid even if browser storage is unavailable. */ }
          location.replace(`/order-confirmation/${value}`); return;
        }
        if (order.paymentStatus === 'PAID_REVIEW_REQUIRED') { setState('Payment received. Please contact support to confirm fulfilment of this order.'); return; }
        setState('Payment is not yet confirmed. If you were charged, please wait or contact us before paying again.');
        setPending(order.status === 'PENDING');
      } catch { if (!stopped) setState('We could not check your payment yet. Please contact support before paying again.'); }
      attempts++;
    };
    void check(); const timer=setInterval(() => { if(attempts < 10) void check(); else clearInterval(timer); },5000);
    return () => { stopped=true;clearInterval(timer); };
  },[]);
  return <main className="simple-page"><div><p className="eyebrow">ZYRA / Payment</p><h1>{state}</h1>{pending && <><p>Your order is saved. If you cancelled without paying, you can reopen the same payment session.</p><button className="dark-button" disabled={busy} onClick={async () => { setBusy(true); try { const response=await fetch('/api/payments/safepay',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});const result=await response.json();if(!response.ok)throw new Error(result.error);location.assign(result.url); } catch { setState('Payment cannot be reopened yet. Please contact support with your order reference.');setBusy(false); } }}>{busy ? 'Opening…' : 'Return to Safepay'}</button></>}<a className="outline-button" href="/pages/contact">Contact support</a>{token && <a className="inline-link" href={`/order-confirmation/${encodeURIComponent(token)}`}>View order</a>}<a className="inline-link" href="/collections">Continue shopping</a></div></main>;
}
