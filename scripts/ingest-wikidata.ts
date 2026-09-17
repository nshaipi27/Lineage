import { fetchInfluencePage } from "../lib/wikidata";

const rows = await fetchInfluencePage(0, 5);
console.log(rows);