/**
 * Silhouette geometry for the player backdrops.
 *
 * Every path is generated from a fixed seed, so the same scene renders
 * identically on the server and the client — a `Math.random()` here would
 * produce a hydration mismatch and a visible flash on load.
 *
 * The canvas is a portrait phone: 390 x 844, drawn with `slice` so it fills
 * any aspect ratio without distorting the horizon.
 */

export const SCENE_WIDTH = 390;
export const SCENE_HEIGHT = 844;

/** Small deterministic PRNG (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth a list of points into a closed silhouette filled to the bottom. */
function closedSpline(points: readonly [number, number][]): string {
  if (points.length === 0) return "";

  const parts: string[] = [`M ${points[0][0]} ${points[0][1]}`];
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const mx = (x0 + x1) / 2;
    parts.push(`Q ${x0} ${y0} ${mx} ${(y0 + y1) / 2}`);
    parts.push(`Q ${x1} ${y1} ${x1} ${y1}`);
  }
  parts.push(`L ${SCENE_WIDTH} ${SCENE_HEIGHT}`);
  parts.push(`L 0 ${SCENE_HEIGHT}`);
  parts.push("Z");
  return parts.join(" ");
}

/**
 * A mountain ridge. `jag` controls how angular the peaks are — high for
 * rock, low for rolling hills.
 */
export function ridge(options: {
  seed: number;
  baseY: number;
  amplitude: number;
  jag?: number;
  steps?: number;
}): string {
  const { seed, baseY, amplitude, jag = 1, steps = 9 } = options;
  const rand = seeded(seed);
  const points: [number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const x = (SCENE_WIDTH / steps) * i;
    // Two octaves: a broad shape plus finer detail, so ridges do not read
    // as a single sine wave.
    const broad = Math.sin((i / steps) * Math.PI * 1.6 + seed) * 0.5 + 0.5;
    const detail = (rand() - 0.5) * jag;
    points.push([x, baseY - amplitude * (broad + detail * 0.55)]);
  }

  return closedSpline(points);
}

/** Rolling dunes or soft hills: same generator, gentler settings. */
export function hills(options: {
  seed: number;
  baseY: number;
  amplitude: number;
}): string {
  return ridge({ ...options, jag: 0.25, steps: 5 });
}

/**
 * A pine treeline. Triangles of varying height along a baseline, which reads
 * as forest at a glance without needing per-tree detail.
 */
export function treeline(options: {
  seed: number;
  baseY: number;
  height: number;
  count?: number;
}): string {
  const { seed, baseY, height, count = 26 } = options;
  const rand = seeded(seed);
  const step = SCENE_WIDTH / count;
  const parts: string[] = [`M 0 ${SCENE_HEIGHT}`, `L 0 ${baseY}`];

  for (let i = 0; i < count; i++) {
    const x = step * i;
    const h = height * (0.55 + rand() * 0.75);
    const w = step * (0.85 + rand() * 0.5);
    parts.push(`L ${x + w * 0.15} ${baseY}`);
    parts.push(`L ${x + w / 2} ${baseY - h}`);
    parts.push(`L ${x + w * 0.85} ${baseY}`);
  }

  parts.push(`L ${SCENE_WIDTH} ${baseY}`);
  parts.push(`L ${SCENE_WIDTH} ${SCENE_HEIGHT}`);
  parts.push("Z");
  return parts.join(" ");
}

/**
 * Foreground meadow: tapered blades fanning out from the bottom edge.
 * Used for the grass and flower-field scenes.
 */
export function meadow(options: {
  seed: number;
  baseY: number;
  height: number;
  count?: number;
}): string {
  const { seed, baseY, height, count = 46 } = options;
  const rand = seeded(seed);
  const parts: string[] = [`M 0 ${SCENE_HEIGHT}`, `L 0 ${baseY}`];

  for (let i = 0; i < count; i++) {
    const x = (SCENE_WIDTH / count) * i + rand() * 6;
    const h = height * (0.35 + rand() * 1.1);
    const lean = (rand() - 0.5) * 26;
    // Each blade is a quadratic spike returning to the baseline.
    parts.push(
      `L ${x} ${baseY} Q ${x + lean * 0.5} ${baseY - h * 0.6} ${x + lean} ${baseY - h} Q ${x + lean * 0.5} ${baseY - h * 0.5} ${x + 3.4} ${baseY}`,
    );
  }

  parts.push(`L ${SCENE_WIDTH} ${baseY}`);
  parts.push(`L ${SCENE_WIDTH} ${SCENE_HEIGHT}`);
  parts.push("Z");
  return parts.join(" ");
}

/** Sunflower-style heads on stems, for the wind scene. */
export function flowerField(options: {
  seed: number;
  baseY: number;
  count?: number;
}): { stems: string; heads: readonly [number, number, number][] } {
  const { seed, baseY, count = 9 } = options;
  const rand = seeded(seed);
  const stems: string[] = [];
  const heads: [number, number, number][] = [];

  for (let i = 0; i < count; i++) {
    const x = (SCENE_WIDTH / count) * i + rand() * 28 - 6;
    const h = 120 + rand() * 190;
    const lean = (rand() - 0.5) * 34;
    const topY = baseY - h;
    stems.push(
      `M ${x} ${SCENE_HEIGHT} Q ${x + lean * 0.4} ${baseY - h * 0.5} ${x + lean} ${topY}`,
    );
    heads.push([x + lean, topY, 16 + rand() * 16]);
  }

  return { stems: stems.join(" "), heads };
}

/** Horizontal wave bands for the ocean scenes. */
export function waveBands(options: {
  seed: number;
  horizonY: number;
  count?: number;
}): readonly { path: string; opacity: number }[] {
  const { seed, horizonY, count = 7 } = options;
  const rand = seeded(seed);
  const bands: { path: string; opacity: number }[] = [];
  const span = SCENE_HEIGHT - horizonY;

  for (let i = 0; i < count; i++) {
    // Bands bunch near the horizon and spread toward the viewer, which is
    // what gives the water its sense of depth.
    const t = (i + 1) / count;
    const y = horizonY + span * t * t;
    const amp = 3 + t * 16;
    const points: [number, number][] = [];
    for (let s = 0; s <= 6; s++) {
      const x = (SCENE_WIDTH / 6) * s;
      points.push([x, y + Math.sin(s * 1.7 + seed + i) * amp * (0.5 + rand() * 0.5)]);
    }

    const d = points
      .map(([x, py], idx) => (idx === 0 ? `M ${x} ${py}` : `L ${x} ${py}`))
      .join(" ");
    bands.push({ path: d, opacity: 0.1 + t * 0.22 });
  }

  return bands;
}

/** Star field for the night scenes. */
export function stars(options: {
  seed: number;
  count?: number;
  maxY?: number;
}): readonly [number, number, number][] {
  const { seed, count = 40, maxY = 430 } = options;
  const rand = seeded(seed);
  return Array.from({ length: count }, () => {
    const x = rand() * SCENE_WIDTH;
    const y = rand() * maxY;
    const r = 0.5 + rand() * 1.3;
    return [x, y, r] as [number, number, number];
  });
}

/** Birds as small open chevrons, scattered across the upper sky. */
export function birdFlock(options: {
  seed: number;
  count?: number;
}): readonly string[] {
  const { seed, count = 7 } = options;
  const rand = seeded(seed);
  return Array.from({ length: count }, () => {
    const x = 40 + rand() * (SCENE_WIDTH - 90);
    const y = 90 + rand() * 220;
    const s = 5 + rand() * 7;
    return `M ${x} ${y} q ${s / 2} ${-s * 0.55} ${s} 0 M ${x + s} ${y} q ${s / 2} ${-s * 0.55} ${s} 0`;
  });
}
