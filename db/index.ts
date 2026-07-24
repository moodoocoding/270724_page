import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}

let initialized = false;

export async function ensureDb() {
  if (initialized) return;
  if (!env.DB) throw new Error("데이터베이스 연결을 준비하지 못했습니다.");

  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      admin_code TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      school TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (class_id) REFERENCES classes(id)
    )`),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS participants_class_school_name_idx ON participants(class_id, school, name)"),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_id INTEGER NOT NULL,
      step INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      data_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (participant_id) REFERENCES participants(id)
    )`),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS submissions_participant_step_idx ON submissions(participant_id, step)"),
  ]);
  initialized = true;
}
