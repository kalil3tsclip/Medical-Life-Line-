// Minimal Cloudflare D1 stand-in backed by Node's built-in SQLite (D1 is SQLite), for tests only.
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

export function createD1(migrationPath) {
  const db = new DatabaseSync(":memory:");
  const sql = readFileSync(migrationPath, "utf8").split("--> statement-breakpoint").join("\n");
  db.exec(sql);
  const stmt = (query, args = []) => ({
    bind: (...a) => stmt(query, a),
    first: async () => { const row = db.prepare(query).get(...args); return row ? { ...row } : null; },
    all: async () => ({ results: db.prepare(query).all(...args).map((r) => ({ ...r })) }),
    run: async () => { const info = db.prepare(query).run(...args); return { meta: { changes: Number(info.changes) } }; },
  });
  return { prepare: (q) => stmt(q), _raw: db };
}
