type Attempt = { fingerprint: string; key: string };
// Persist only a digest and an idempotency key, never contact/address form values.
export async function checkoutAttempt(storage: Pick<Storage, 'getItem' | 'setItem'>, payload: string): Promise<Attempt> {
  const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload)))).map(byte => byte.toString(16).padStart(2, '0')).join('');
  try {
    const previous = JSON.parse(storage.getItem('zyra-checkout-attempt') || 'null') as Attempt | null;
    if (previous?.fingerprint === fingerprint && /^[a-f0-9-]{36}$/.test(previous.key)) return previous;
  } catch {}
  const attempt = { fingerprint, key: crypto.randomUUID() };
  storage.setItem('zyra-checkout-attempt', JSON.stringify(attempt));
  return attempt;
}
