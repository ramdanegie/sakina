#!/usr/bin/env node
/**
 * Generates the app icon set.
 *
 * Run with:  node scripts/make-icons.mjs
 * Requires:  rsvg-convert  (brew install librsvg)
 *
 * The mark is three nested pointed arches: a mihrab niche, and equally sound
 * radiating from a source. Everything sits inside the centre ~62% of the
 * canvas so it survives the circular crop Android applies to maskable icons.
 *
 * Each variant is emitted at every size the platforms ask for, so a user can
 * pick one in Settings before adding the app to their home screen.
 *
 * To add your own artwork instead: drop a square SVG at public/icon.svg and
 * skip this script — nothing else reads the variants.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const run = promisify(execFile);

const OUT = path.join(process.cwd(), "public", "icons");
const SIZES = [32, 180, 192, 512];

/**
 * Palettes drawn from the app's own earth-tone tokens, so the icon belongs to
 * the same world as the UI.
 */
const VARIANTS = [
  {
    id: "sage",
    name: "Sage",
    bg: ["#6d8172", "#465a4c", "#26312a"],
    mark: ["#f2e9d6", "#d9c7a4"],
  },
  {
    id: "terracotta",
    name: "Terracotta",
    bg: ["#b08268", "#8a5a44", "#3d2519"],
    mark: ["#fdf3e6", "#f0d9b8"],
  },
  {
    id: "midnight",
    name: "Midnight",
    bg: ["#2c3a5c", "#1a2238", "#080b14"],
    mark: ["#e8eefc", "#c3d0ee"],
  },
  {
    id: "maroon",
    name: "Maroon",
    bg: ["#8a5560", "#5c3540", "#26161b"],
    mark: ["#fbeaea", "#eccdcd"],
  },
  {
    id: "ochre",
    name: "Ochre",
    bg: ["#c2a05e", "#8c7038", "#3a2d13"],
    mark: ["#fffaec", "#f2e2b8"],
  },
  {
    id: "ink",
    name: "Ink",
    bg: ["#3a3a3a", "#1f1f1f", "#000000"],
    mark: ["#ffffff", "#d4d4d4"],
  },
];

function svg({ bg, mark }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="Sakina">
  <title>Sakina</title>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0%" stop-color="${bg[0]}" />
      <stop offset="55%" stop-color="${bg[1]}" />
      <stop offset="100%" stop-color="${bg[2]}" />
    </linearGradient>
    <linearGradient id="mark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${mark[0]}" />
      <stop offset="100%" stop-color="${mark[1]}" />
    </linearGradient>
  </defs>

  <rect width="512" height="512" fill="url(#bg)" />

  <g fill="none" stroke="url(#mark)" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 146 372 L 146 250 Q 146 140 256 140 Q 366 140 366 250 L 366 372" stroke-width="20" opacity="0.42" />
    <path d="M 182 372 L 182 264 Q 182 178 256 178 Q 330 178 330 264 L 330 372" stroke-width="20" opacity="0.7" />
    <path d="M 218 372 L 218 278 Q 218 216 256 216 Q 294 216 294 278 L 294 372" stroke-width="20" opacity="1" />
  </g>

  <circle cx="256" cy="352" r="21" fill="url(#mark)" />
</svg>
`;
}

async function main() {
  try {
    await run("rsvg-convert", ["--version"]);
  } catch {
    console.error("rsvg-convert not found. Install it with: brew install librsvg");
    process.exit(1);
  }

  await mkdir(OUT, { recursive: true });
  const manifest = [];

  for (const variant of VARIANTS) {
    const source = path.join(OUT, `${variant.id}.svg`);
    await writeFile(source, svg(variant));

    for (const size of SIZES) {
      await run("rsvg-convert", [
        "-w", String(size),
        "-h", String(size),
        source,
        "-o", path.join(OUT, `${variant.id}-${size}.png`),
      ]);
    }

    manifest.push({ id: variant.id, name: variant.name, accent: variant.bg[0] });
    console.log(`✓ ${variant.name}`);
  }

  await writeFile(
    path.join(OUT, "variants.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  // The default variant also lands at the well-known root paths, so a browser
  // that ignores the manifest still finds an icon.
  const [first] = VARIANTS;
  const root = path.join(process.cwd(), "public");
  await writeFile(path.join(root, "icon.svg"), svg(first));
  for (const [size, name] of [
    [512, "icon-512.png"],
    [192, "icon-192.png"],
    [180, "apple-touch-icon.png"],
    [32, "favicon-32.png"],
  ]) {
    await run("rsvg-convert", [
      "-w", String(size),
      "-h", String(size),
      path.join(OUT, `${first.id}.svg`),
      "-o", path.join(root, name),
    ]);
  }

  // ── Social share card ────────────────────────────────────────────────
  //
  // Written as a real .png in public/ rather than via Next.js's
  // `opengraph-image` route convention. In a static export that convention
  // emits an extensionless file, which static hosts serve with no
  // Content-Type — and social crawlers refuse an image without `image/png`,
  // so the share card silently renders blank.
  const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#46584c" />
      <stop offset="55%" stop-color="#2b3830" />
      <stop offset="100%" stop-color="#121714" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <g transform="translate(96, 185) scale(0.51)">
    <g fill="none" stroke="#f2e9d6" stroke-width="20" stroke-linecap="round" stroke-linejoin="round">
      <path d="M 146 372 L 146 250 Q 146 140 256 140 Q 366 140 366 250 L 366 372" opacity="0.42" />
      <path d="M 182 372 L 182 264 Q 182 178 256 178 Q 330 178 330 264 L 330 372" opacity="0.7" />
      <path d="M 218 372 L 218 278 Q 218 216 256 216 Q 294 216 294 278 L 294 372" />
    </g>
    <circle cx="256" cy="352" r="21" fill="#f2e9d6" />
  </g>
  <text x="430" y="268" font-family="Ubuntu, Helvetica, Arial, sans-serif" font-size="104" font-weight="700" fill="#f7f2e6">Sakina</text>
  <text x="430" y="330" font-family="Ubuntu, Helvetica, Arial, sans-serif" font-size="40" fill="#d9c7a4">Listen to the Quran, calmly</text>
  <text x="430" y="404" font-family="Ubuntu, Helvetica, Arial, sans-serif" font-size="26" fill="#a8b5a9">100+ reciters &#183; ambient background sound</text>
  <text x="430" y="444" font-family="Ubuntu, Helvetica, Arial, sans-serif" font-size="26" fill="#a8b5a9">offline &#183; free forever</text>
</svg>
`;

  const ogSource = path.join(OUT, "og.svg");
  await writeFile(ogSource, ogSvg);
  await run("rsvg-convert", [
    "-w", "1200",
    "-h", "630",
    ogSource,
    "-o", path.join(root, "og.png"),
  ]);
  console.log("\u2713 Social card \u2192 public/og.png");

  console.log(`\n${VARIANTS.length} variants written to public/icons/`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
