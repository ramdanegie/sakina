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
  { id: "none", queries: ["starry night sky landscape silhouette", "night sky stars mountains"] },
  { id: "rain", queries: ["rain clouds mountain valley landscape", "misty mountains fog rain"] },
  {
    id: "thunder-storm",
    queries: [
      "storm clouds landscape dramatic",
      "thunderstorm cloud sky prairie",
      "dark storm sky field",
    ],
  },
  { id: "thunder", queries: ["lightning storm sky night", "lightning bolt sky"] },
  {
    id: "wind",
    queries: [
      "wheat field golden sunset landscape",
      "sunflower field summer sky",
      "grass field wind sky clouds",
    ],
  },
  { id: "wave", queries: ["ocean waves sea horizon sunset", "sea waves coast"] },
  { id: "river", queries: ["river valley forest green landscape", "mountain river stream"] },
  {
    id: "fire",
    queries: ["campfire night flames dark", "bonfire flames night", "fire embers dark"],
  },
  {
    id: "birds",
    queries: [
      "sunrise mountains clouds landscape",
      "birds flying sky sunrise",
      "dawn sky clouds landscape",
    ],
  },
  { id: "crickets", queries: ["meadow grass dusk field evening", "meadow wildflowers summer"] },
  { id: "night-forest", queries: ["forest night moonlight trees", "dark forest trees mist"] },
  { id: "owl", queries: ["full moon night sky trees silhouette", "moon night clouds"] },
  { id: "cat", queries: ["golden hour warm sunset hills", "sunset countryside warm light"] },
  {
    id: "whale",
    queries: [
      "underwater ocean blue sunlight",
      "underwater sea light rays",
      "deep blue sea underwater",
    ],
  },
  {
    id: "train",
    queries: [
      "railway countryside landscape dusk",
      "railway track landscape",
      "train tracks countryside",
    ],
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

function pickCandidate(pages) {
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (info === undefined) continue;

    const meta = info.extmetadata ?? {};
    const licence = meta.LicenseShortName?.value ?? "";
    if (!licenceAllowed(licence)) continue;

    // Landscape only: a portrait crop of a portrait photo loses the horizon.
    if (!(info.thumbwidth > info.thumbheight)) continue;
    if (!info.thumburl) continue;

    return {
      title: plain(page.title.replace(/^File:/, "")),
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
        picked = pickCandidate(await search(query));
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
