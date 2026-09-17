import { closeDb, getDb } from "../lib/db";
import { PAGE_SIZE, fetchInfluencePage } from "../lib/wikidata";

const MAX_PAGES = 15;
const SLEEP_MS = 1500;

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

const db = getDb();

const upsertArtist = db.prepare(`
    INSERT INTO artists (id, name, year, genres, wikidata_id, spotify_id)
    VALUES (@id, @name, @year, @genres, @wikidata_id, @spotify_id)
    ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    year = COALESCE(excluded.year, artists.year),
    spotify_id = COALESCE(excluded.spotify_id, artists.spotify_id)
`);

const upsertEdge = db.prepare(`
    INSERT OR IGNORE INTO edges (source_id, target_id, type, weight)
    VALUES (@source_id, @target_id, 'influence', 1)
`);

const writePage = db.transaction((rows: Awaited<ReturnType<typeof fetchInfluencePage>>) => {
    for (const row of rows){
        upsertArtist.run({
            id: row.influenceId,
            name: row.influenceName,
            year: null,
            genres: null,
            wikidata_id: row.influenceId,
            spotify_id: row.influenceSpotify,
        });
        upsertArtist.run({
            id: row.artistId,
            name: row.artistName,
            year: null,
            genres: null,
            wikidata_id: row.artistId,
            spotify_id: row.artistSpotify,
        });
        upsertEdge.run({
            source_id: row.artistId,
            target_id: row.influenceId,
        });
    }
});

async function main() {
    const rows = await fetchInfluencePage(0, 5);
    writePage(rows);
  
    const counts = db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM artists) AS artists,
           (SELECT COUNT(*) FROM edges) AS edges`,
      )
      .get();
    console.log("wrote", rows.length, "rows");
    console.log("totals", counts);
  
    closeDb();
}
  
main();
