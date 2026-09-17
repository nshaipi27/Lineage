import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "lineage.sqlite");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS artists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  year INTEGER,
  genres TEXT,
  wikidata_id TEXT UNIQUE,
  spotify_id TEXT,
  image_url TEXT,
  popularity INTEGER
);

CREATE TABLE IF NOT EXISTS edges (
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  type TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1,
  PRIMARY KEY (source_id, target_id, type),
  FOREIGN KEY (source_id) REFERENCES artists(id),
  FOREIGN KEY (target_id) REFERENCES artists(id)
);

CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id);
CREATE INDEX IF NOT EXISTS idx_artists_spotify ON artists(spotify_id);
CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name);
`;

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

export function closeDb() {
  db?.close();
  db = null;
}