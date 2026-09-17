import { closeDb, getDb } from "../lib/db";

const db = getDb();

const upsertArtist = db.prepare(`
  INSERT OR REPLACE INTO artists (id, name, year, genres, wikidata_id, spotify_id)
  VALUES (@id, @name, @year, @genres, @wikidata_id, @spotify_id)
`);

upsertArtist.run({
  id: "smoke-miles",
  name: "Miles Davis",
  year: 1926,
  genres: JSON.stringify(["jazz"]),
  wikidata_id: "smoke-miles",
  spotify_id: null,
});

upsertArtist.run({
  id: "smoke-kendrick",
  name: "Kendrick Lamar",
  year: 1987,
  genres: JSON.stringify(["hip hop"]),
  wikidata_id: "smoke-kendrick",
  spotify_id: null,
});

db.prepare(`
  INSERT OR REPLACE INTO edges (source_id, target_id, type, weight)
  VALUES (@source_id, @target_id, @type, @weight)
`).run({
  source_id: "smoke-kendrick",
  target_id: "smoke-miles",
  type: "influence",
  weight: 1,
});

const row = db.prepare(`
  SELECT a.name AS source_name, e.type, b.name AS target_name
  FROM edges e
  JOIN artists a ON a.id = e.source_id
  JOIN artists b ON b.id = e.target_id
  WHERE e.source_id = 'smoke-kendrick'
`).get();

console.log(row);

const counts = db
  .prepare(
    `SELECT
       (SELECT COUNT(*) FROM artists) AS artists,
       (SELECT COUNT(*) FROM edges) AS edges`,
  )
  .get();
console.log(counts);

closeDb();