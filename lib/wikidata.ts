const ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT =
  "Lineage/0.1 (https://github.com/nshaipi27/Lineage; educational project)";
export const PAGE_SIZE = 400;

export type InfluenceRow = {
  artistId: string;
  artistName: string;
  artistSpotify: string | null;
  artistYear: number | null;
  influenceId: string;
  influenceName: string;
  influenceSpotify: string | null;
};

type Binding = Record<string, { value: string } | undefined>;

export function qidFromUri(uri: string): string {
  const id = uri.split("/").pop();
  if (!id || !id.startsWith("Q")) {
    throw new Error(`Expected Wikidata URI, got: ${uri}`);
  }
  return id;
}

function val(b: Binding, key: string): string | null {
  return b[key]?.value ?? null;
}

function buildQuery(offset: number, limit: number): string {
  return `
SELECT ?artist ?artistLabel ?influencedBy ?influencedByLabel ?spotify ?infSpotify ?year WHERE {
  ?artist wdt:P1902 ?spotify .
  ?artist wdt:P737 ?influencedBy .
  OPTIONAL { ?influencedBy wdt:P1902 ?infSpotify }
  OPTIONAL { ?artist wdt:P569 ?birth }
  OPTIONAL { ?artist wdt:P571 ?inception }
  BIND(COALESCE(YEAR(?inception), YEAR(?birth)) AS ?year)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT ${limit}
OFFSET ${offset}
`.trim();
}

export async function fetchInfluencePage(
  offset: number,
  limit = PAGE_SIZE,
): Promise<InfluenceRow[]> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams({ query: buildQuery(offset, limit) }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Wikidata ${res.status}: ${text.slice(0, 500)}`);
  }

  let json: { results?: { bindings?: Binding[] } };
  try {
    json = JSON.parse(text) as { results?: { bindings?: Binding[] } };
  } catch {
    throw new Error(`Wikidata non-JSON: ${text.slice(0, 400)}`);
  }

  const bindings = json.results?.bindings;
  if (!bindings) {
    throw new Error(`Wikidata missing bindings: ${text.slice(0, 400)}`);
  }

  return bindings.map((b) => {
    const yearRaw = val(b, "year");
    const year = yearRaw ? Number.parseInt(yearRaw, 10) : NaN;
    return {
      artistId: qidFromUri(val(b, "artist")!),
      artistName: val(b, "artistLabel") ?? val(b, "artist")!,
      artistSpotify: val(b, "spotify"),
      artistYear: Number.isFinite(year) ? year : null,
      influenceId: qidFromUri(val(b, "influencedBy")!),
      influenceName: val(b, "influencedByLabel") ?? val(b, "influencedBy")!,
      influenceSpotify: val(b, "infSpotify"),
    };
  });
}
