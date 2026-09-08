import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export function activityPath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 180) return null;
  if (['/', '/collections', '/checkout'].includes(value)) return value;
  return /^\/(products|collections)\/[a-z0-9-]{1,100}$/.test(value) ? value : null;
}

export class VisitorActivityStore {
  private db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, visitor TEXT NOT NULL, action TEXT NOT NULL, path TEXT NOT NULL, device TEXT NOT NULL, created INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS events_created ON events(created);
      CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);`);
    const columns = this.db.prepare('PRAGMA table_info(events)').all();
    if (!columns.some(column => column.name === 'is_test')) this.db.exec('ALTER TABLE events ADD COLUMN is_test INTEGER NOT NULL DEFAULT 0');
  }
  record(visitor: string, action: string, path: string, device: string, now = Date.now(), isTest = false) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.prune(now);
      this.db.prepare('DELETE FROM limits WHERE expires < ?').run(now);
      for (const [key, max] of [['global', 1000], [visitor, 60]] as const) {
        this.db.prepare('INSERT INTO limits VALUES (?,0,?) ON CONFLICT(key) DO NOTHING').run(key, now + 60_000);
        const row = this.db.prepare('UPDATE limits SET count=count+1 WHERE key=? RETURNING count').get(key);
        if (Number(row?.count) > max) { this.db.exec('COMMIT'); return false; }
      }
      this.db.prepare('INSERT INTO events(visitor,action,path,device,created,is_test) VALUES (?,?,?,?,?,?)').run(visitor, action, path, device, now, isTest ? 1 : 0);
      this.db.exec('COMMIT'); return true;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  private prune(now: number) { this.db.prepare('DELETE FROM events WHERE created < ?').run(now - 30 * 86400000); }
  read(now = Date.now(), isTest = false) {
    this.prune(now);
    return {
      summary: this.db.prepare(`SELECT COUNT(DISTINCT visitor) AS visitors, SUM(action='page_view') AS views,
        SUM(action='add_to_bag') AS bagAdds, SUM(action='checkout_view') AS checkouts FROM events WHERE is_test=?`).get(isTest ? 1 : 0),
      visitors: this.db.prepare(`SELECT visitor, MAX(created) AS lastSeen, MIN(created) AS firstSeen, COUNT(*) AS events,
        MAX(device) AS device FROM events WHERE is_test=? GROUP BY visitor ORDER BY lastSeen DESC LIMIT 100`).all(isTest ? 1 : 0),
      events: this.db.prepare('SELECT visitor, action, path, device, created FROM events WHERE is_test=? ORDER BY created DESC LIMIT 1000').all(isTest ? 1 : 0),
      mode: isTest ? 'preview' : 'customers',
    };
  }
  close() { this.db.close(); }
}
let store: VisitorActivityStore | undefined;
export function getVisitorActivity() {
  if (process.env.NODE_ENV === 'production') throw new Error('Visitor activity requires production database setup.');
  if (!store) {
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    store = new VisitorActivityStore(join(process.cwd(), 'data', 'visitor-activity.sqlite'));
  }
  return store;
}
