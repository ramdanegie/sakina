"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import {
  birdFlock,
  flowerField,
  hills,
  meadow,
  ridge,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  stars,
  treeline,
  waveBands,
} from "./scene-shapes";

/**
 * The player backdrop: a calm landscape per background sound.
 *
 * Two layers, in this order:
 *
 *   1. A vector scene drawn from gradients and silhouettes, in the palette of
 *      that bed. It is a few kilobytes and always present.
 *   2. A real photograph on top, fading in once decoded.
 *
 * The vector layer is not decoration — it is the guarantee. Photographs are
 * bundled locally rather than hotlinked so they survive offline, but they are
 * still ~200KB each and decode asynchronously; without something underneath,
 * opening the player on a cold cache would show a black rectangle. If a photo
 * is missing or fails, the drawn landscape simply stays.
 *
 * Each vector scene is built the way a landscape reads: sky wash, a light
 * source, receding silhouette layers (haziest at the back), a foreground, and
 * finally a legibility scrim.
 *
 * Photography is public-domain or CC0 from Wikimedia Commons; see
 * `scripts/fetch-scenery.mjs` and the generated `scenery-credits.json`.
 */

type Element =
  | { kind: "ridge"; d: string; fill: string; opacity?: number; className?: string }
  | { kind: "glow"; cx: number; cy: number; r: number; color: string; className?: string }
  | { kind: "disc"; cx: number; cy: number; r: number; color: string; className?: string }
  | { kind: "strokes"; paths: readonly string[]; color: string; width: number; opacity?: number; className?: string }
  | { kind: "dots"; points: readonly [number, number, number][]; color: string; className?: string }
  | { kind: "bands"; bands: readonly { path: string; opacity: number }[]; color: string; width: number };

interface Scene {
  /** Sky gradient, top to bottom. */
  readonly sky: readonly string[];
  readonly elements: readonly Element[];
  /** Optional CSS overlay for motion (rain, gusts, flicker, flash). */
  readonly overlay?: {
    background: string;
    className?: string;
    opacity?: number;
    blend?: "screen" | "overlay";
  };
}

function streaks(angle: number, color: string, gap: number, width: number) {
  return `repeating-linear-gradient(${angle}deg, transparent 0px, transparent ${gap}px, ${color} ${gap}px, ${color} ${gap + width}px)`;
}

const HORIZON = 470;

const SCENES: Readonly<Record<string, Scene>> = {
  /* Nothing playing: quiet night hills under a cool glow. */
  none: {
    sky: ["#05060f", "#0a1030", "#050716"],
    elements: [
      { kind: "glow", cx: 300, cy: 830, r: 460, color: "rgba(37,99,235,0.85)" },
      { kind: "dots", points: stars({ seed: 3, count: 46, maxY: 400 }), color: "rgba(226,232,240,0.5)", className: "ambient-breathe" },
      { kind: "ridge", d: hills({ seed: 11, baseY: 600, amplitude: 90 }), fill: "#0b1024", opacity: 0.95 },
      { kind: "ridge", d: hills({ seed: 27, baseY: 700, amplitude: 70 }), fill: "#070a1a" },
    ],
  },

  /* Overcast mountains in drifting rain. */
  rain: {
    sky: ["#39464b", "#4a565a", "#1b2226"],
    elements: [
      { kind: "glow", cx: 300, cy: 150, r: 300, color: "rgba(226,232,240,0.45)" },
      { kind: "ridge", d: ridge({ seed: 5, baseY: 470, amplitude: 200, jag: 1.1 }), fill: "#5b676b", opacity: 0.55 },
      { kind: "ridge", d: ridge({ seed: 19, baseY: 560, amplitude: 190, jag: 1.3 }), fill: "#3c4749", opacity: 0.85 },
      { kind: "ridge", d: ridge({ seed: 41, baseY: 690, amplitude: 140, jag: 0.9 }), fill: "#242c2e" },
      { kind: "ridge", d: meadow({ seed: 7, baseY: 812, height: 46 }), fill: "#4d5230", opacity: 0.9 },
    ],
    overlay: {
      background: streaks(74, "rgba(226,232,240,0.18)", 7, 1),
      className: "ambient-fall",
      opacity: 0.5,
    },
  },

  /* The same range, colder, cut by lightning. */
  "thunder-storm": {
    sky: ["#1b2233", "#2b3346", "#0b0f18"],
    elements: [
      { kind: "glow", cx: 230, cy: 130, r: 280, color: "rgba(165,180,252,0.45)" },
      { kind: "ridge", d: ridge({ seed: 9, baseY: 460, amplitude: 220, jag: 1.4 }), fill: "#37415c", opacity: 0.5 },
      { kind: "ridge", d: ridge({ seed: 23, baseY: 580, amplitude: 200, jag: 1.2 }), fill: "#222a3d" },
      { kind: "ridge", d: treeline({ seed: 31, baseY: 760, height: 90 }), fill: "#12172270" },
    ],
    overlay: {
      background:
        "radial-gradient(70% 45% at 55% 10%, rgba(224,231,255,0.95) 0%, rgba(165,180,252,0.3) 32%, transparent 62%)",
      className: "ambient-flash",
      blend: "screen",
    },
  },

  thunder: {
    sky: ["#12142e", "#20244a", "#080a16"],
    elements: [
      { kind: "glow", cx: 140, cy: 180, r: 260, color: "rgba(129,140,248,0.4)" },
      { kind: "ridge", d: ridge({ seed: 13, baseY: 520, amplitude: 210, jag: 1.5 }), fill: "#272c55", opacity: 0.7 },
      { kind: "ridge", d: ridge({ seed: 37, baseY: 660, amplitude: 170, jag: 1.1 }), fill: "#14172e" },
    ],
    overlay: {
      background:
        "radial-gradient(60% 40% at 32% 16%, rgba(199,210,254,0.9) 0%, transparent 60%)",
      className: "ambient-flash",
      blend: "screen",
    },
  },

  /* Sunflower field at dusk — the field bends, the sky is warm and high. */
  wind: {
    sky: ["#2c3a45", "#5d5a3d", "#241d10"],
    elements: [
      { kind: "glow", cx: 110, cy: 300, r: 330, color: "rgba(253,224,171,0.4)" },
      { kind: "ridge", d: treeline({ seed: 3, baseY: 470, height: 74, count: 30 }), fill: "#2a2c22", opacity: 0.85 },
      { kind: "ridge", d: hills({ seed: 17, baseY: 540, amplitude: 40 }), fill: "#3d3a1f" },
      ...(() => {
        const field = flowerField({ seed: 21, baseY: 700, count: 9 });
        return [
          {
            kind: "strokes" as const,
            paths: [field.stems],
            color: "#4a4520",
            width: 7,
            opacity: 0.95,
            className: "ambient-sway",
          },
          {
            kind: "dots" as const,
            points: field.heads,
            color: "#d9a326",
            className: "ambient-sway",
          },
        ];
      })(),
      { kind: "ridge", d: meadow({ seed: 29, baseY: 820, height: 90, count: 40 }), fill: "#2f2c15", className: "ambient-sway" },
    ],
    overlay: {
      background: streaks(172, "rgba(255,240,200,0.12)", 24, 2),
      className: "ambient-drift-fast",
      opacity: 0.45,
    },
  },

  /* Open sea, low sun, swell rolling toward the viewer. */
  wave: {
    sky: ["#2a4a63", "#6b7b7a", "#0a2236"],
    elements: [
      { kind: "glow", cx: 195, cy: 300, r: 340, color: "rgba(253,215,150,0.5)" },
      { kind: "disc", cx: 195, cy: 380, r: 44, color: "rgba(255,236,190,0.85)" },
      { kind: "ridge", d: `M 0 ${HORIZON} L ${SCENE_WIDTH} ${HORIZON} L ${SCENE_WIDTH} ${SCENE_HEIGHT} L 0 ${SCENE_HEIGHT} Z`, fill: "#0d3b5c" },
      { kind: "bands", bands: waveBands({ seed: 8, horizonY: HORIZON }), color: "#cfe9f7", width: 3 },
    ],
    overlay: {
      background:
        "radial-gradient(120% 40% at 50% 100%, rgba(3,20,36,0.85) 0%, transparent 62%)",
      className: "ambient-swell",
    },
  },

  /* A river cutting through a green valley. */
  river: {
    sky: ["#2b4d54", "#4d7361", "#10201c"],
    elements: [
      { kind: "glow", cx: 260, cy: 190, r: 300, color: "rgba(191,242,220,0.35)" },
      { kind: "ridge", d: ridge({ seed: 6, baseY: 470, amplitude: 170, jag: 0.9 }), fill: "#3f6357", opacity: 0.6 },
      { kind: "ridge", d: treeline({ seed: 15, baseY: 560, height: 66, count: 34 }), fill: "#1f3a31" },
      // The water is a tapering wedge running to the horizon.
      { kind: "ridge", d: `M 150 545 L 240 545 L 330 ${SCENE_HEIGHT} L 60 ${SCENE_HEIGHT} Z`, fill: "#5fa8b8", opacity: 0.55, className: "ambient-breathe" },
      { kind: "ridge", d: meadow({ seed: 33, baseY: 800, height: 70, count: 30 }), fill: "#16281f" },
    ],
    overlay: {
      background: streaks(100, "rgba(204,251,241,0.12)", 15, 2),
      className: "ambient-drift-fast",
      opacity: 0.4,
    },
  },

  /* A campfire clearing: light from the ground up, trees closing around it. */
  fire: {
    sky: ["#160a04", "#2e1408", "#0a0402"],
    elements: [
      { kind: "dots", points: stars({ seed: 12, count: 26, maxY: 300 }), color: "rgba(255,236,200,0.35)" },
      { kind: "ridge", d: treeline({ seed: 4, baseY: 470, height: 130, count: 22 }), fill: "#180d06" },
      { kind: "glow", cx: 195, cy: 810, r: 330, color: "rgba(251,146,60,0.95)", className: "ambient-flicker" },
      { kind: "glow", cx: 195, cy: 830, r: 170, color: "rgba(254,240,138,0.8)", className: "ambient-flicker" },
      { kind: "ridge", d: hills({ seed: 25, baseY: 830, amplitude: 30 }), fill: "#2a1409", opacity: 0.8 },
    ],
  },

  /* Daybreak over distant hills, birds already up. */
  birds: {
    sky: ["#1d6ea8", "#7fb8cf", "#20303a"],
    elements: [
      { kind: "glow", cx: 300, cy: 250, r: 320, color: "rgba(254,240,138,0.7)", className: "ambient-breathe" },
      { kind: "disc", cx: 300, cy: 250, r: 38, color: "rgba(255,250,220,0.95)" },
      { kind: "strokes", paths: birdFlock({ seed: 2, count: 7 }), color: "rgba(20,30,40,0.6)", width: 2 },
      { kind: "ridge", d: hills({ seed: 14, baseY: 500, amplitude: 110 }), fill: "#4a7f96", opacity: 0.6 },
      { kind: "ridge", d: treeline({ seed: 22, baseY: 620, height: 72, count: 28 }), fill: "#24414d" },
      { kind: "ridge", d: meadow({ seed: 38, baseY: 810, height: 60 }), fill: "#16262e" },
    ],
  },

  /* A warm meadow after dark. */
  crickets: {
    sky: ["#0a1710", "#16301f", "#040806"],
    elements: [
      { kind: "dots", points: stars({ seed: 18, count: 52, maxY: 420 }), color: "rgba(216,255,228,0.6)", className: "ambient-breathe" },
      { kind: "ridge", d: hills({ seed: 9, baseY: 520, amplitude: 80 }), fill: "#12251a" },
      { kind: "ridge", d: treeline({ seed: 26, baseY: 610, height: 56, count: 32 }), fill: "#0c1a12" },
      { kind: "ridge", d: meadow({ seed: 44, baseY: 830, height: 110, count: 52 }), fill: "#0a1a10", className: "ambient-sway" },
    ],
  },

  /* Deep pine forest under a full moon. */
  "night-forest": {
    sky: ["#04100c", "#0c2019", "#010403"],
    elements: [
      { kind: "dots", points: stars({ seed: 30, count: 60, maxY: 400 }), color: "rgba(209,250,229,0.55)", className: "ambient-breathe" },
      { kind: "glow", cx: 280, cy: 150, r: 200, color: "rgba(209,250,229,0.4)" },
      { kind: "disc", cx: 280, cy: 150, r: 32, color: "rgba(236,254,245,0.9)" },
      { kind: "ridge", d: treeline({ seed: 7, baseY: 500, height: 110, count: 20 }), fill: "#0a1a14", opacity: 0.75 },
      { kind: "ridge", d: treeline({ seed: 16, baseY: 640, height: 150, count: 15 }), fill: "#050f0b" },
      { kind: "ridge", d: treeline({ seed: 34, baseY: 830, height: 190, count: 11 }), fill: "#020705" },
    ],
  },

  /* Bare tree, big moon, very still. */
  owl: {
    sky: ["#0a0d22", "#1b2140", "#03040c"],
    elements: [
      { kind: "dots", points: stars({ seed: 21, count: 54, maxY: 430 }), color: "rgba(224,231,255,0.6)", className: "ambient-breathe" },
      { kind: "glow", cx: 290, cy: 170, r: 210, color: "rgba(199,210,254,0.45)" },
      { kind: "disc", cx: 290, cy: 170, r: 40, color: "rgba(238,242,255,0.92)" },
      { kind: "ridge", d: hills({ seed: 10, baseY: 600, amplitude: 90 }), fill: "#131938" },
      { kind: "ridge", d: treeline({ seed: 28, baseY: 780, height: 130, count: 13 }), fill: "#080b1c" },
    ],
  },

  /* A warm window at dusk — the only scene with no cool tones. */
  cat: {
    sky: ["#2a1219", "#5c2f2c", "#100608"],
    elements: [
      { kind: "glow", cx: 300, cy: 300, r: 300, color: "rgba(253,186,116,0.45)" },
      { kind: "disc", cx: 300, cy: 320, r: 46, color: "rgba(254,215,170,0.75)" },
      { kind: "ridge", d: hills({ seed: 20, baseY: 540, amplitude: 120 }), fill: "#41202a", opacity: 0.8 },
      { kind: "ridge", d: hills({ seed: 36, baseY: 660, amplitude: 90 }), fill: "#26121a" },
      { kind: "ridge", d: meadow({ seed: 42, baseY: 820, height: 70 }), fill: "#170a10", className: "ambient-sway" },
    ],
  },

  /* Below the surface: light falling in shafts. */
  whale: {
    sky: ["#0a3a5e", "#0a2744", "#01060d"],
    elements: [
      { kind: "glow", cx: 195, cy: -40, r: 420, color: "rgba(147,197,253,0.5)" },
      {
        kind: "strokes",
        paths: [
          `M 90 0 L 40 ${SCENE_HEIGHT}`,
          `M 180 0 L 150 ${SCENE_HEIGHT}`,
          `M 260 0 L 300 ${SCENE_HEIGHT}`,
          `M 330 0 L 380 ${SCENE_HEIGHT}`,
        ],
        color: "rgba(191,219,254,0.16)",
        width: 34,
        className: "ambient-swell",
      },
      { kind: "ridge", d: ridge({ seed: 24, baseY: 800, amplitude: 120, jag: 1.2 }), fill: "#04121f" },
    ],
  },

  /* Hills passing a window at dusk, blurred by motion. */
  train: {
    sky: ["#2b2318", "#5a4630", "#0d0a07"],
    elements: [
      { kind: "glow", cx: 90, cy: 260, r: 300, color: "rgba(253,224,171,0.4)" },
      { kind: "disc", cx: 90, cy: 300, r: 34, color: "rgba(255,226,170,0.7)" },
      { kind: "ridge", d: hills({ seed: 8, baseY: 500, amplitude: 100 }), fill: "#4a3a24", opacity: 0.65 },
      { kind: "ridge", d: treeline({ seed: 32, baseY: 620, height: 60, count: 30 }), fill: "#2a2115" },
      { kind: "ridge", d: hills({ seed: 40, baseY: 780, amplitude: 60 }), fill: "#171109" },
    ],
    overlay: {
      background: streaks(176, "rgba(250,240,220,0.12)", 9, 3),
      className: "ambient-drift-fast",
      opacity: 0.55,
    },
  },
};

function renderElement(element: Element, key: string) {
  switch (element.kind) {
    case "ridge":
      return (
        <path
          key={key}
          d={element.d}
          fill={element.fill}
          opacity={element.opacity}
          className={element.className}
        />
      );

    case "glow":
      return (
        <circle
          key={key}
          cx={element.cx}
          cy={element.cy}
          r={element.r}
          fill={`url(#${key}-grad)`}
          className={element.className}
        />
      );

    case "disc":
      return (
        <circle
          key={key}
          cx={element.cx}
          cy={element.cy}
          r={element.r}
          fill={element.color}
          className={element.className}
        />
      );

    case "strokes":
      return (
        <g key={key} className={element.className} opacity={element.opacity}>
          {element.paths.map((d, i) => (
            <path
              key={i}
              d={d}
              stroke={element.color}
              strokeWidth={element.width}
              strokeLinecap="round"
              fill="none"
            />
          ))}
        </g>
      );

    case "dots":
      return (
        <g key={key} className={element.className}>
          {element.points.map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill={element.color} />
          ))}
        </g>
      );

    case "bands":
      return (
        <g key={key}>
          {element.bands.map((band, i) => (
            <path
              key={i}
              d={band.path}
              stroke={element.color}
              strokeWidth={element.width}
              strokeLinecap="round"
              opacity={band.opacity}
              fill="none"
            />
          ))}
        </g>
      );
  }
}

export function AmbientBackdrop({ ambientId }: { ambientId: string | null }) {
  const id = ambientId ?? "none";
  const scene = SCENES[id] ?? SCENES.none;

  // Photography is the finish; the vector scene underneath is the guarantee.
  // If the image is still downloading, missing, or the device is offline, the
  // drawn landscape is already on screen in the right palette, so the player
  // never falls back to a flat black rectangle.
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  return (
    // Remounting per scene restarts the cross-fade cleanly rather than
    // interpolating between two unrelated landscapes.
    <div
      key={id}
      className="animate-in fade-in absolute inset-0 overflow-hidden duration-700"
      aria-hidden
    >
      <svg
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
        role="presentation"
      >
        <defs>
          <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            {scene.sky.map((stop, i) => (
              <stop
                key={i}
                offset={`${(i / (scene.sky.length - 1)) * 100}%`}
                stopColor={stop}
              />
            ))}
          </linearGradient>

          {scene.elements.map((element, i) =>
            element.kind === "glow" ? (
              <radialGradient key={i} id={`el-${i}-grad`}>
                <stop offset="0%" stopColor={element.color} />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            ) : null,
          )}
        </defs>

        <rect
          width={SCENE_WIDTH}
          height={SCENE_HEIGHT}
          fill={`url(#${id}-sky)`}
        />
        {scene.elements.map((element, i) => renderElement(element, `el-${i}`))}
      </svg>

      {/*
        A plain <img> on purpose: next/image's optimiser does not run in a
        static export, and this is a decorative full-bleed backdrop that is
        already downscaled and compressed at build time.
      */}
      {!photoFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/scenery/${id}.jpg`}
          alt=""
          decoding="async"
          loading="eager"
          onLoad={() => setPhotoLoaded(true)}
          onError={() => setPhotoFailed(true)}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-700",
            photoLoaded ? "opacity-100" : "opacity-0",
          )}
        />
      ) : null}

      {scene.overlay !== undefined ? (
        <div
          className={cn("absolute inset-0", scene.overlay.className)}
          style={{
            background: scene.overlay.background,
            opacity: scene.overlay.opacity,
            mixBlendMode: scene.overlay.blend,
          }}
        />
      ) : null}

      {/*
        Legibility scrim.

        Deliberately not darkest at the very bottom: most scenes put their
        light source or foreground detail down there. It peaks over the band
        where the title and artist sit and eases off at the last few percent,
        so the landscape still shows behind the toolbar icons — which are
        solid white and legible either way.
      */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.8) 20%, rgba(0,0,0,0.55) 38%, rgba(0,0,0,0.12) 62%, rgba(0,0,0,0.35) 100%)",
        }}
      />
    </div>
  );
}
