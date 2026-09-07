#!/usr/bin/env node
/**
 * Fetches the player backdrop photography from Wikimedia Commons.
 *
 * Run with:  node scripts/fetch-scenery.mjs
 *
 * Why Commons rather than a stock site: its API is queryable without a key,
 * every file carries machine-readable licence metadata, and we can filter to
 * public-domain and CC0 works only. That removes the attribution and
 * share-alike obligations a CC BY-SA photo would drag in, and means the
 * images can be bundled and served from our own origin — so the backdrops
 * keep working offline, which hotlinking a stock CDN would break.
 *
 * Output:
 *   public/scenery/<id>.jpg        downscaled backdrop
 *   src/infrastructure/content/scenery-credits.json
 *
 * The credits file is generated, not hand-written, so the Credits screen can
 * never drift from what actually shipped.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const run = promisify(execFile);

const API = "https://commons.wikimedia.org/w/api.php";
const UA = "SakinaApp/0.1 (https://github.com/ramdanegie/sakina)";

const OUT_DIR = path.join(process.cwd(), "public", "scenery");
const CREDITS = path.join(
  process.cwd(),
  "src",
  "infrastructure",
  "content",
  "scenery-credits.json",
);

/** Only these licences ship: no attribution or share-alike strings attached. */
const ALLOWED = [
  /^cc0/i,
  /public domain/i,
  /^pd/i,
];

/**
 * One query per ambient bed. Terms are deliberately scenic and generic —
 * we want a calm wide landscape, not a subject study.
 */
const SCENES = [
  { id: "none", queries: ["starry night sky landscape silhouette", "night sky stars mountains"],
    subjects: ["night", "star", "milky", "sky"], },
  { id: "rain", queries: ["rain clouds mountain valley landscape", "misty mountains fog rain"],
    subjects: ["rain", "fog", "mist", "cloud"], },
  {
    id: "thunder-storm",
    queries: [
      "storm clouds landscape dramatic",
      "thunderstorm cloud sky prairie",
      "dark storm sky field",
    ],
    subjects: ["storm", "thunder", "cloud"],
  },
  { id: "thunder", queries: ["lightning strike night sky", "lightning bolt thunderstorm", "lightning over city night"],
    subjects: ["lightning", "thunder"], },
  {
    id: "wind",
    queries: [
      "wheat field golden sunset landscape",
      "sunflower field summer sky",
      "grass field wind sky clouds",
    ],
    subjects: ["field", "wheat", "sunflower", "grass", "meadow"],
  },
  { id: "wave", queries: ["ocean waves sea horizon sunset", "sea waves coast"],
    subjects: ["wave", "sea", "ocean", "surf", "coast"], },
  { id: "river", queries: ["river flowing forest rocks", "mountain stream river forest", "river rapids landscape"],
    subjects: ["river", "stream", "creek", "rapid"], },
  {
    id: "fire",
    queries: ["campfire at night", "bonfire flames dark", "camp fire burning night"],
    subjects: ["campfire", "bonfire", "flame"],
  },
  {
    id: "birds",
    queries: ["flock birds flying sky", "birds silhouette sunset flock", "seagulls flying sky"],
    subjects: ["bird", "gull", "flock", "crane", "goose"],
  },
  { id: "crickets", queries: ["meadow grass dusk field evening", "meadow wildflowers summer"],
    subjects: ["meadow", "grass", "field", "wildflower"], },
  { id: "night-forest", queries: ["forest at night moonlight", "night forest trees stars", "moonlit forest"],
    subjects: ["night", "moonlit", "moonlight"], },
  { id: "owl", queries: ["full moon night sky trees silhouette", "moon night clouds"],
    subjects: ["moon", "night"], },
  { id: "cat", queries: ["cat sleeping window sunlight", "cat resting indoor warm light", "domestic cat portrait window"],
    subjects: ["cat", "kitten", "feline"], },
  {
    id: "whale",
    queries: ["humpback whale ocean surface", "whale tail fluke sea", "whale breaching ocean"],
    subjects: ["whale", "humpback", "orca"],
  },
  {
    id: "train",
    queries: ["steam locomotive railway landscape", "train in mountain landscape", "passenger train countryside"],
    subjects: ["locomotive", "train"],
  },
];

function licenceAllowed(name) {
  return ALLOWED.some((pattern) => pattern.test(name ?? ""));
}

/** Strip the HTML Commons embeds in its metadata fields. */
function plain(value) {
  return (value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

async function search(query) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: `filetype:bitmap ${query}`,
    gsrnamespace: "6",
    // Over-fetch: most results will fail the licence filter.
    gsrlimit: "20",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "1600",
  });

  const response = await fetch(`${API}?${params}`, {
    headers: { "User-Agent": UA },
  });
  if (!response.ok) throw new Error(`Commons search failed: ${response.status}`);

  const payload = await response.json();
  return Object.values(payload?.query?.pages ?? {});
}

/**
 * Commons full-text search matches file *descriptions*, so a query for
 * "campfire" happily returns an architectural survey photo whose caption
 * mentions a fireplace. Requiring the subject word in the file's own title is
 * what keeps the backdrop showing the thing the sound is named after.
 */
function isRelevant(title, subjects) {
  const haystack = title.toLowerCase();
  return subjects.some((word) => haystack.includes(word));
}

function pickCandidate(pages, subjects) {
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (info === undefined) continue;

    const meta = info.extmetadata ?? {};
    const licence = meta.LicenseShortName?.value ?? "";
    if (!licenceAllowed(licence)) continue;

    // Landscape only: a portrait crop of a portrait photo loses the horizon.
    if (!(info.thumbwidth > info.thumbheight)) continue;
    if (!info.thumburl) continue;

    const title = page.title.replace(/^File:/, "");
    if (!isRelevant(title, subjects)) continue;

    return {
      title: plain(title),
      author: plain(meta.Artist?.value) || "Unknown",
      licence: plain(licence),
      source: info.descriptionurl,
      url: info.thumburl,
    };
  }
  return null;
}

/**
 * Downscale and compress with sips (built into macOS). The image sits behind
 * a dark scrim at low opacity, so it can be far smaller than it looks.
 */
async function optimise(file) {
  try {
    await run("sips", [
      "-Z",
      "1400",
      "-s",
      "format",
      "jpeg",
      "-s",
      "formatOptions",
      "55",
      file,
      "--out",
      file,
    ]);
    return true;
  } catch {
    console.warn(`  (sips unavailable — shipping ${path.basename(file)} as-is)`);
    return false;
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const credits = {};
  let ok = 0;

  for (const scene of SCENES) {
    process.stdout.write(`${scene.id.padEnd(15)} `);

    try {
      // Most Commons hits are CC BY-SA, which we reject, so a single query
      // often yields nothing usable. Fall through the alternates before
      // giving up and letting the vector scene stand in.
      let picked = null;
      for (const query of scene.queries) {
        picked = pickCandidate(await search(query), scene.subjects);
        if (picked !== null) break;
        await new Promise((r) => setTimeout(r, 300));
      }

      if (picked === null) {
        console.log("no freely-licensed landscape found — keeping SVG scene");
        continue;
      }

      const image = await fetch(picked.url, { headers: { "User-Agent": UA } });
      if (!image.ok) throw new Error(`download ${image.status}`);

      const file = path.join(OUT_DIR, `${scene.id}.jpg`);
      await writeFile(file, Buffer.from(await image.arrayBuffer()));
      await optimise(file);

      credits[scene.id] = {
        title: picked.title,
        author: picked.author,
        licence: picked.licence,
        source: picked.source,
      };
      ok += 1;
      console.log(`✓ ${picked.licence}`);
    } catch (error) {
      console.log(`failed (${String(error).slice(0, 60)}) — keeping SVG scene`);
    }

    // Courtesy pause; Commons asks clients not to hammer the API.
    await new Promise((r) => setTimeout(r, 400));
  }

  await writeFile(CREDITS, `${JSON.stringify(credits, null, 2)}\n`);
  console.log(`\n${ok}/${SCENES.length} backdrops fetched.`);
  console.log(`Credits written to ${path.relative(process.cwd(), CREDITS)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
