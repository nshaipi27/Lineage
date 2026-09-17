import { fetchInfluencePage } from "../lib/wikidata";

async function main() {
    const  rows = await fetchInfluencePage(0, 5);
    console.log(rows);
}
main();