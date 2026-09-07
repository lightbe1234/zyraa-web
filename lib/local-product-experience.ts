import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { emptyProductDetails, type ProductDetails, type ProductReview } from './product-experience-types.ts';

// Development-only store. Never use a local disk database in a Vercel function.
export class LocalProductExperience {
  private db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS details (slug TEXT PRIMARY KEY, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS presence (slug TEXT NOT NULL, visitor TEXT NOT NULL, seen INTEGER NOT NULL, PRIMARY KEY(slug, visitor));
      CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, slug TEXT NOT NULL, proof TEXT NOT NULL UNIQUE, author TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), text TEXT NOT NULL, size TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, action TEXT NOT NULL, subject TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL);
    `);
  }
  private transaction<T>(action: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const value = action(); this.db.exec('COMMIT'); return value; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  read(slug: string) {
    const row = this.db.prepare('SELECT body FROM details WHERE slug = ?').get(slug);
    const details: ProductDetails = row ? JSON.parse(String(row.body)) : { ...emptyProductDetails };
    const reviews = this.db.prepare('SELECT id, author, rating, text, size, created_at AS createdAt FROM reviews WHERE slug = ? ORDER BY created_at DESC LIMIT 100').all(slug) as unknown as ProductReview[];
    return { details, reviews, reviewsAvailable: true };
  }
  limit(key: string, max: number, windowMs: number, now = Date.now()) {
    return this.transaction(() => {
      this.db.prepare('DELETE FROM limits WHERE expires < ?').run(now);
      this.db.prepare('INSERT INTO limits VALUES (?, 0, ?) ON CONFLICT(key) DO NOTHING').run(key, now + windowMs);
      const row = this.db.prepare('UPDATE limits SET count = count + 1 WHERE key = ? RETURNING count').get(key);
      return Number(row?.count) <= max;
    });
  }
  heartbeat(slug: string, visitor: string, now = Date.now()) {
    return this.transaction(() => {
      this.db.prepare('DELETE FROM presence WHERE seen < ?').run(now - 60_000);
      this.db.prepare('INSERT INTO presence VALUES (?, ?, ?) ON CONFLICT(slug, visitor) DO UPDATE SET seen = excluded.seen').run(slug, visitor, now);
      return Number(this.db.prepare('SELECT COUNT(*) AS count FROM presence WHERE slug = ?').get(slug)?.count || 0);
    });
  }
  saveDetails(slug: string, details: ProductDetails, actor: string) {
    this.transaction(() => {
      this.db.prepare('INSERT INTO details VALUES (?, ?) ON CONFLICT(slug) DO UPDATE SET body = excluded.body').run(slug, JSON.stringify(details));
      this.db.prepare('INSERT INTO audit VALUES (?, ?, ?, ?, ?)').run(randomUUID(), 'product_details_saved', slug, actor, new Date().toISOString());
    });
  }
  addReview(slug: string, proof: string, review: Omit<ProductReview, 'id' | 'createdAt'>) {
    this.transaction(() => {
      this.db.prepare('INSERT INTO reviews VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), slug, proof, review.author, review.rating, review.text, review.size, new Date().toISOString());
      this.db.prepare('INSERT INTO audit VALUES (?, ?, ?, ?, ?)').run(randomUUID(), 'purchase_review_added', slug, proof, new Date().toISOString());
    });
  }
  close() { this.db.close(); }
}

let store: LocalProductExperience | undefined;
export function getLocalProductExperience() {
  if (process.env.NODE_ENV === 'production') throw new Error('Local product experience is disabled in production.');
  if (!store) {
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    store = new LocalProductExperience(join(process.cwd(), 'data', 'product-experience.sqlite'));
  }
  return store;
}
