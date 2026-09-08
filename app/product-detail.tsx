'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, CreditCard, Eye, Minus, PackageCheck, Plus, Ruler, ShoppingBag, Star, Truck, X, ZoomIn } from 'lucide-react';
import { money, type Product } from '@/lib/catalog';
import type { StoreSettings } from '@/lib/supabase-store';
import type { BagSelection } from '@/lib/product-purchase';
import { emptyProductDetails, type ProductExperience } from '@/lib/product-experience-types';

function ProductModal({ title, close, children, wide = false }: { title: string; close: () => void; children: ReactNode; wide?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { element?.close(); document.body.style.overflow = previous; };
  }, []);
  return <dialog ref={dialog} className={`pdp-modal ${wide ? 'pdp-modal-wide' : ''}`} aria-label={title}
    onCancel={(event) => { event.preventDefault(); close(); }} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
    <div className="pdp-modal-inner"><header><h2>{title}</h2><button type="button" onClick={close} aria-label={`Close ${title}`}><X /></button></header>{children}</div>
  </dialog>;
}

export function ProductDetail({ product, settings, cart, add, related, ready }: {
  product: Product; settings: StoreSettings; cart: BagSelection[];
  add: (item: BagSelection, buyNow?: boolean) => boolean; related: ReactNode; ready: boolean;
}) {
  const gallery = [...new Set((product.images?.length ? product.images : [product.image, product.alternate]).filter(Boolean))];
  const [size, setSize] = useState('');
  const [color, setColor] = useState(product.colors[0] || '');
  const [qty, setQty] = useState(1);
  const [active, setActive] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<'zoom' | 'size' | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [unit, setUnit] = useState<'cm' | 'in'>('cm');
  const [experience, setExperience] = useState<ProductExperience | null>(null);
  const [viewers, setViewers] = useState<number | null>(null);
  const [showSticky, setShowSticky] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const track = useRef<HTMLDivElement>(null);
  const purchase = useRef<HTMLDivElement>(null);
  const sizes = useRef<HTMLFieldSetElement>(null);
  const details = experience?.details || emptyProductDetails;
  const reviews = experience?.reviews || [];
  const average = reviews.length ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length : 0;
  const inBag = cart.filter((entry) => entry.slug === product.slug).reduce((total, entry) => total + entry.qty, 0);
  const sameVariant = cart.find((entry) => entry.slug === product.slug && entry.size === size && entry.color === color)?.qty || 0;
  const available = Math.max(0, Math.min(10 - sameVariant, product.stock - inBag));
  const soldOut = product.stock <= 0;
  const onSale = Boolean(product.compareAt && product.compareAt > product.price);
  const salePercent = onSale ? Math.round((1 - product.price / product.compareAt!) * 100) : 0;
  const genericDescription = product.description.startsWith('A considered everyday layer cut with a relaxed silhouette');
  const summary = details.summary || (!genericDescription ? product.description.split(/(?<=[.!?])\s/)[0] : 'A fresh addition to your everyday rotation. Choose your colour and find your fit.');
  const endpoint = `/api/product-experience/${product.slug}`;
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const showImage = (index: number) => {
    const next = (index + gallery.length) % gallery.length;
    setActive(next); setZoomed(false);
    track.current?.scrollTo({ left: next * track.current.clientWidth, behavior: reducedMotion() ? 'instant' : 'smooth' });
  };

  useEffect(() => {
    const controller = new AbortController();
    fetch(endpoint, { signal: controller.signal, cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then(setExperience).catch(() => { if (!controller.signal.aborted) setExperience({ details: emptyProductDetails, reviews: [], reviewsAvailable: false }); });
    return () => controller.abort();
  }, [endpoint]);
  useEffect(() => {
    let stopped = false;
    let pending = false;
    const heartbeat = async () => {
      if (document.visibilityState !== 'visible' || pending) return;
      pending = true;
      try {
        const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'heartbeat' }) });
        const result = response.ok ? await response.json() : null;
        if (!stopped) setViewers(Number.isInteger(result?.count) && result.count > 0 ? result.count : null);
      } catch { if (!stopped) setViewers(null); }
      finally { pending = false; }
    };
    void heartbeat();
    const timer = setInterval(heartbeat, 25_000);
    document.addEventListener('visibilitychange', heartbeat);
    return () => { stopped = true; clearInterval(timer); document.removeEventListener('visibilitychange', heartbeat); };
  }, [endpoint]);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting && entry.boundingClientRect.bottom < 0), { threshold: 0 });
    if (purchase.current) observer.observe(purchase.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => { setQty((current) => Math.max(1, Math.min(current, available))); }, [available]);

  const submit = (buyNow = false) => {
    if (busy || !ready) return;
    if (!size || !color) {
      setError('Select your size to continue.');
      sizes.current?.scrollIntoView({ behavior: reducedMotion() ? 'instant' : 'smooth', block: 'center' });
      sizes.current?.querySelector<HTMLButtonElement>('button[data-size]')?.focus({ preventScroll: true });
      return;
    }
    if (soldOut || qty > available) { setError('This quantity is unavailable. Check the pieces already in your bag.'); return; }
    setError(''); setBusy(true);
    const added = add({ slug: product.slug, color, size, qty }, buyNow);
    if (!added) setError('We could not update your bag. Please check the message and try again.');
    if (!buyNow || !added) setBusy(false);
  };
  const measurementKeys = (['chest', 'length', 'waist', 'inseam'] as const).filter((key) => details.measurements.some((row) => row[key]));
  const measurementLabel = { chest: 'Chest width', length: 'Length', waist: 'Waist width', inseam: 'Inseam' };
  const displayMeasurement = (value: number | undefined) => value == null ? '—' : unit === 'cm' ? value : (value / 2.54).toFixed(1);
  return <main className="pdp-page">
    <nav className="pdp-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/collections">Shop</a><span>/</span><span aria-current="page">{product.name}</span></nav>
    <div className="pdp-layout">
      <section className="pdp-gallery" aria-label={`${product.name} photos`}>
        <div className="pdp-gallery-frame">
          <div ref={track} className="pdp-image-track" onScroll={(event) => setActive(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))}>
            {gallery.map((src, index) => <button key={`${src}-${index}`} type="button" tabIndex={active === index ? 0 : -1}
              onClick={() => { setActive(index); setModal('zoom'); }} aria-label={`Enlarge ${product.name}, photo ${index + 1}`}>
              <img src={src} alt={`${product.name} — photo ${index + 1}`} loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : 'auto'} />
            </button>)}
          </div>
          {onSale && !soldOut && <span className="pdp-sale-label">Save {salePercent}%</span>}
          {soldOut && <span className="pdp-sale-label">Sold out</span>}
          <button className="pdp-zoom-button" type="button" onClick={() => setModal('zoom')} aria-label="Zoom product photo"><ZoomIn /></button>
          <div className="pdp-gallery-controls">
            <button type="button" onClick={() => showImage(active - 1)} disabled={gallery.length < 2} aria-label="Previous product photo"><ArrowLeft /></button>
            <span aria-live="polite">{active + 1} / {gallery.length}</span>
            <button type="button" onClick={() => showImage(active + 1)} disabled={gallery.length < 2} aria-label="Next product photo"><ArrowRight /></button>
          </div>
        </div>
        <div className="pdp-thumbnails" aria-label="Choose a product photo">{gallery.map((src, index) => <button key={src} type="button" aria-pressed={active === index} onClick={() => showImage(index)} aria-label={`Show photo ${index + 1}`}><img src={src} alt="" loading="lazy" /></button>)}</div>
        <p className="pdp-gallery-note"><ZoomIn aria-hidden="true" /> Tap a photo to explore the details</p>
      </section>

      <section className="pdp-info" aria-label="Product and purchase options">
        <p className="eyebrow">{product.category}</p>
        <h1>{product.name}</h1>
        {reviews.length > 0 && <a className="pdp-rating" href="#product-reviews"><Star aria-hidden="true" /> {average.toFixed(1)} <span>({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span></a>}
        <div className="pdp-price"><strong>{money(product.price)}</strong>{onSale && <><del><span className="sr-only">Original price </span>{money(product.compareAt!)}</del><span>Save {money(product.compareAt! - product.price)}</span></>}</div>
        {viewers !== null && <p className="pdp-viewers" title="Unique browser sessions active on this product in the last 60 seconds. Duplicate tabs count once."><Eye aria-hidden="true" /> {viewers} {viewers === 1 ? 'visitor' : 'visitors'} viewed this in the last minute</p>}
        <p className="pdp-summary">{summary}</p>
        {(details.material || details.fit) && <ul className="pdp-facts">{details.fit && <li><Check />{details.fit}</li>}{details.material && <li><Check />{details.material}</li>}</ul>}

        <fieldset className="pdp-options" disabled={!ready}><legend>Colour <span>{color}</span></legend><div>{product.colors.map((entry) => <button type="button" key={entry} aria-pressed={color === entry} onClick={() => setColor(entry)}>{entry}</button>)}</div></fieldset>
        <fieldset className={`pdp-options pdp-sizes ${error && !size ? 'pdp-invalid' : ''}`} disabled={!ready} ref={sizes} aria-describedby={error ? 'pdp-purchase-error' : 'pdp-fit-note'}>
          <legend>Size {size && <span>{size}</span>}<button className="pdp-size-guide" type="button" onClick={() => setModal('size')}><Ruler aria-hidden="true" />Size guide</button></legend>
          <div>{product.sizes.map((entry) => <button data-size type="button" key={entry} aria-pressed={size === entry} disabled={soldOut} onClick={() => { setSize(entry); setError(''); }}>{entry}</button>)}</div>
          <p id="pdp-fit-note">{details.sizeNote || 'Unsure of your size? Check the fit guide before you choose.'}</p>
        </fieldset>

        <div className="pdp-purchase" ref={purchase}>
          <p className={`pdp-stock ${soldOut ? 'pdp-stock-unavailable' : ''}`}><span />{soldOut ? 'Currently sold out' : 'In stock'}{!soldOut && product.stock < 5 ? ` · ${product.stock} remaining` : ''}</p>
          <div className="pdp-buy-row">
            <div className="pdp-quantity" role="group" aria-label="Quantity">
              <button type="button" aria-label="Decrease quantity" disabled={qty <= 1 || soldOut} onClick={() => setQty(qty - 1)}><Minus /></button>
              <output aria-live="polite">{qty}</output>
              <button type="button" aria-label="Increase quantity" disabled={qty >= available || soldOut} onClick={() => setQty(qty + 1)}><Plus /></button>
            </div>
            <button className="pdp-primary" type="button" disabled={!ready || soldOut || available === 0 || busy} onClick={() => submit()}>{soldOut ? 'Sold out' : available === 0 ? 'Stock already in bag' : 'Add to bag'}<ShoppingBag aria-hidden="true" /></button>
          </div>
          <button className="pdp-secondary" type="button" disabled={!ready || soldOut || available === 0 || busy} onClick={() => submit(true)}>{busy ? 'Opening checkout…' : 'Buy now'}<ArrowRight aria-hidden="true" /></button>
          {error && <p id="pdp-purchase-error" className="pdp-error" role="alert">{error}</p>}
          <p className="pdp-checkout-note"><CreditCard aria-hidden="true" />Cash on delivery or bank transfer at checkout</p>
        </div>

        <div className="pdp-assurances">
          <div><Truck aria-hidden="true" /><p><strong>{settings.flatShipping === 0 ? 'Free delivery' : `Delivery ${money(settings.flatShipping)}`}</strong><span>{settings.freeShippingThreshold > 0 ? `Free on orders of ${money(settings.freeShippingThreshold)} or more` : 'Free shipping on all orders'}</span></p></div>
          <a href="/pages/returns"><PackageCheck aria-hidden="true" /><p><strong>7-day size exchange</strong><span>Unworn items · see exchange conditions</span></p><ArrowRight aria-hidden="true" /></a>
        </div>
        <div className="pdp-accordions">
          <details><summary>Product details<ChevronDown /></summary><div>{!genericDescription && product.description !== summary && <p>{product.description}</p>}<dl><div><dt>Style</dt><dd>{product.name}</dd></div><div><dt>Category</dt><dd>{product.category}</dd></div>{details.material && <div><dt>Material</dt><dd>{details.material}</dd></div>}{details.fit && <div><dt>Fit</dt><dd>{details.fit}</dd></div>}</dl></div></details>
          <details><summary>Size & fit<ChevronDown /></summary><div><p>{details.fit || 'Compare a garment you already own with this product’s measurements.'}</p><p>{details.sizeNote || 'Measurements vary by style. Our team can help you choose.'}</p><button className="pdp-text-button" type="button" onClick={() => setModal('size')}>Open size guide <ArrowRight /></button></div></details>
          <details><summary>Care instructions<ChevronDown /></summary><div><p>{details.care || 'Follow the care label on your garment. Contact us if you need care instructions before ordering.'}</p></div></details>
          <details><summary>Delivery & exchange<ChevronDown /></summary><div><p>{settings.flatShipping ? `Standard delivery is ${money(settings.flatShipping)}.` : 'Standard delivery is free.'} {settings.freeShippingThreshold > 0 ? `Orders of ${money(settings.freeShippingThreshold)} or more qualify for free shipping.` : ''} Delivery details and the final total are shown at checkout.</p><p>Size exchanges can be requested within 7 days for unworn items, subject to availability and the store’s exchange conditions.</p><a href="/pages/shipping">Delivery information</a><a href="/pages/returns">Exchange policy</a></div></details>
        </div>
        <a className="pdp-help" href="/pages/contact">Need a hand with fit or delivery? <span>Contact ZYRA <ArrowRight /></span></a>
      </section>
    </div>

    <section className="pdp-reviews" id="product-reviews" aria-label="Product customer reviews">
      <header><div><p className="eyebrow">From the people who wear it</p><h2>Customer reviews</h2></div>{reviews.length > 0 && <p><Star aria-hidden="true" />{average.toFixed(1)} / 5 <span>· {reviews.length} reviews</span></p>}</header>
      {reviews.length ? <div className="pdp-review-grid">{reviews.map((review) => <article key={review.id}><div className="pdp-review-stars" aria-label={`${review.rating} out of 5 stars`}>{[1,2,3,4,5].map((star) => <Star key={star} fill={star <= review.rating ? 'currentColor' : 'none'} />)}</div><p>{review.text}</p><footer><strong>{review.author}</strong><span><Check />Verified purchase · Size {review.size}</span><time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</time></footer></article>)}</div>
        : <div className="pdp-review-empty"><p>{experience?.reviewsAvailable === false ? 'Reviews are currently unavailable.' : 'No reviews for this piece yet.'}</p><span>Reviews here come from customers with a verified delivered order.</span></div>}
      {experience?.reviewsAvailable && <details className="pdp-review-form-wrap"><summary>Received your order? Write a review <Plus /></summary><form onSubmit={async (event) => {
        event.preventDefault(); if (reviewBusy) return;
        const form = event.currentTarget;
        const data = new FormData(form);
        setReviewBusy(true); setReviewMessage('');
        try {
          const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'review', number: data.get('number'), contact: data.get('contact'), rating: Number(data.get('rating')), text: data.get('text') }) });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Your review could not be saved.');
          setExperience(result); form.reset(); setReviewMessage('Thank you. Your verified review has been published.');
        } catch (saveError) { setReviewMessage(saveError instanceof Error ? saveError.message : 'Please try again.'); }
        finally { setReviewBusy(false); }
      }}><p>We check your delivered order before publishing. Your email, phone and order number are never displayed.</p><div><label>Order number<input name="number" required maxLength={100} autoComplete="off" /></label><label>Checkout email or phone<input name="contact" required maxLength={160} autoComplete="off" /></label></div><label>Your rating<select name="rating" required defaultValue=""><option value="" disabled>Select a rating</option>{[5,4,3,2,1].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'star' : 'stars'}</option>)}</select></label><label>Your experience<textarea name="text" required minLength={20} maxLength={1000} rows={4} placeholder="Tell us about the fit, feel and your experience." /></label><button type="submit" className="pdp-primary" disabled={reviewBusy}>{reviewBusy ? 'Verifying order…' : 'Submit review'}</button>{reviewMessage && <p role="status">{reviewMessage}</p>}</form></details>}
    </section>
    <div className="pdp-related">{related}</div>

    {showSticky && !modal && <div className="pdp-sticky-buy"><div><span>{product.name}</span><strong>{money(product.price)}</strong></div><button type="button" className="pdp-primary" disabled={!ready || soldOut || available === 0 || busy} onClick={() => submit()}>{soldOut ? 'Sold out' : !size ? 'Choose size' : 'Add to bag'}<ShoppingBag /></button></div>}

    {modal === 'size' && <ProductModal title="Find your fit" close={() => setModal(null)}><p className="pdp-modal-product">{product.name}</p>{details.fit && <p>{details.fit}</p>}
      {details.measurements.length ? <><div className="pdp-unit-switch" role="group" aria-label="Measurement units"><button type="button" aria-pressed={unit === 'cm'} onClick={() => setUnit('cm')}>CM</button><button type="button" aria-pressed={unit === 'in'} onClick={() => setUnit('in')}>IN</button></div><div className="pdp-size-table"><table><caption>Garment measurements in {unit}. Widths are measured flat.</caption><thead><tr><th>Size</th>{measurementKeys.map((key) => <th key={key}>{measurementLabel[key]}</th>)}</tr></thead><tbody>{details.measurements.map((row) => <tr key={row.size}><th>{row.size}</th>{measurementKeys.map((key) => <td key={key}>{displayMeasurement(row[key])}</td>)}</tr>)}</tbody></table></div></>
        : <p className="pdp-size-notice">Measurements for this style haven’t been added yet. Ask our team for the measurements before choosing a size.</p>}
      <h3>How to measure</h3><ol><li>Lay a similar, well-fitting garment flat.</li><li>For tops, measure across the chest from underarm to underarm, then shoulder to hem.</li><li>For bottoms, measure the waistband flat and the inside leg from crotch to hem.</li></ol>{details.sizeNote && <p>{details.sizeNote}</p>}<a className="pdp-secondary" href="/pages/contact">Get sizing help <ArrowRight /></a>
    </ProductModal>}
    {modal === 'zoom' && <ProductModal title="Product photos" close={() => { setModal(null); setZoomed(false); }} wide><div className={`pdp-lightbox-photo ${zoomed ? 'is-zoomed' : ''}`}><button type="button" aria-label={zoomed ? 'Zoom out' : 'Zoom in'} onClick={() => setZoomed(!zoomed)}><img src={gallery[active]} alt={`${product.name} detail, photo ${active + 1}`} /></button></div><div className="pdp-lightbox-controls"><button type="button" aria-label="Previous enlarged photo" onClick={() => showImage(active - 1)} disabled={gallery.length < 2}><ArrowLeft /></button><span>{active + 1} / {gallery.length} · Tap image to {zoomed ? 'zoom out' : 'zoom in'}</span><button type="button" aria-label="Next enlarged photo" onClick={() => showImage(active + 1)} disabled={gallery.length < 2}><ArrowRight /></button></div></ProductModal>}
  </main>;
}
