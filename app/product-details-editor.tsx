'use client';
import { useEffect, useState } from 'react';
import { emptyProductDetails, type ProductDetails } from '@/lib/product-experience-types';

/** Supplemental details save separately so a local preview cannot alter the live catalog. */
export function ProductDetailsEditor({ slug, sizes }: { slug: string; sizes: string[] }) {
  const [details, setDetails] = useState<ProductDetails>(emptyProductDetails);
  const [status, setStatus] = useState('');
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/product-experience/${slug}`, { signal: controller.signal, cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { setDetails(data.details); setAvailable(data.reviewsAvailable); })
      .catch(() => {});
    return () => controller.abort();
  }, [slug]);
  if (!available) return null;
  return <details className="admin-product-details"><summary>Product page content & size guide · local preview</summary>
    <p>Add confirmed details only. These fields save locally using the separate button below; your live product is unchanged.</p>
    <div className="form-grid">
      {(['summary', 'material', 'fit', 'care', 'sizeNote'] as const).map((key) => <label key={key} className="wide">
        {{ summary: 'Short summary (240 characters)', material: 'Confirmed material / fabric', fit: 'Fit description', care: 'Care instructions', sizeNote: 'Size / model fit note' }[key]}
        <textarea rows={key === 'care' ? 3 : 2} maxLength={key === 'summary' ? 240 : key === 'care' ? 600 : key === 'sizeNote' ? 400 : 200} value={details[key]} onChange={(event) => setDetails({ ...details, [key]: event.target.value })} />
      </label>)}
    </div>
    <p>Measurements in cm, laid flat. Leave unmeasured fields empty. For tops use chest/length; for bottoms use waist/inseam.</p>
    <div className="pdp-size-table"><table><thead><tr><th>Size</th>{['Chest width', 'Length', 'Waist width', 'Inseam'].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{sizes.map((size) => <tr key={size}><th>{size}</th>{(['chest', 'length', 'waist', 'inseam'] as const).map((key) => <td key={key}><input aria-label={`${size} ${key} cm`} type="number" min="0.1" max="300" step="0.1" value={details.measurements.find((row) => row.size === size)?.[key] ?? ''}
      onChange={(event) => {
        const current = details.measurements.find((row) => row.size === size) || { size };
        const next = { ...current, [key]: event.target.value === '' ? undefined : Number(event.target.value) };
        setDetails({ ...details, measurements: [...details.measurements.filter((row) => row.size !== size), next] });
      }} /></td>)}</tr>)}</tbody></table></div>
    <button type="button" className="outline-button" disabled={busy} onClick={async () => {
      setBusy(true); setStatus('');
      try {
        const payload = { ...details, measurements: details.measurements.filter((row) => sizes.includes(row.size) && [row.chest, row.length, row.waist, row.inseam].some((value) => value != null)) };
        const response = await fetch(`/api/product-experience/${slug}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Details could not be saved.');
        setStatus('Local product page details saved. Refresh the product page to see them.');
      } catch (error) { setStatus(error instanceof Error ? error.message : 'Please try again.'); }
      finally { setBusy(false); }
    }}>{busy ? 'Saving details…' : 'Save local page details'}</button>
    {status && <p role="status">{status}</p>}
  </details>;
}
