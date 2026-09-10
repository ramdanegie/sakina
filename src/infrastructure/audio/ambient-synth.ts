/**
 * Procedural ambient beds.
 *
 * Each bed is a node graph plus a set of sparse events (a droplet, a chirp, a
 * hoot). Everything is scheduled against the audio context's own clock rather
 * than `setTimeout`, because these graphs are rendered through an
 * OfflineAudioContext — which runs far faster than realtime, so wall-clock
 * timers would pile every event onto the first instant.
 *
 * The rendered result is looped back through an `<audio>` element; see
 * ambient-render.ts for why that indirection exists (iOS suspends Web Audio
 * behind the lock screen).
 *
 * Design rules shared by every bed:
 *
 *  - Nothing important lives below ~150Hz. A phone speaker cannot reproduce it
 *    and only turns it into cone excursion, and stacking low-frequency beds
 *    across the catalogue produced a constant rumble that masked the character
 *    sounds it was meant to sit behind.
 *  - The character sound is always louder than its bed.
 */

export type BedBuilder = (
  ctx: BaseAudioContext,
  out: AudioNode,
  durationSec: number,
) => void;

/* ── helpers ─────────────────────────────────────────────────────────────── */

/** Deterministic PRNG, so a given bed renders identically every time. */
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

type NoiseColor = "white" | "pink" | "brown";

function noiseBuffer(ctx: BaseAudioContext, color: NoiseColor): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * 4);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const rand = seeded(color.length * 977 + length);

  if (color === "white") {
    for (let i = 0; i < length; i++) data[i] = rand() * 2 - 1;
  } else if (color === "pink") {
    // Paul Kellet's economical pink-noise approximation.
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = rand() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  } else {
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = rand() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  }

  return buffer;
}

function startNoise(
  ctx: BaseAudioContext,
  color: NoiseColor,
  duration: number,
): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx, color);
  source.loop = true;
  source.start(0);
  source.stop(duration);
  return source;
}

function filter(
  ctx: BaseAudioContext,
  type: BiquadFilterType,
  frequency: number,
  q = 1,
): BiquadFilterNode {
  const node = ctx.createBiquadFilter();
  node.type = type;
  node.frequency.value = frequency;
  node.Q.value = q;
  return node;
}

/** Slow oscillator for gusts, swells and shimmer. */
function lfo(
  ctx: BaseAudioContext,
  rateHz: number,
  depth: number,
  target: AudioParam,
  centre: number,
  duration: number,
): void {
  const osc = ctx.createOscillator();
  osc.frequency.value = rateHz;
  const gain = ctx.createGain();
  gain.gain.value = depth;
  osc.connect(gain);
  gain.connect(target);
  target.value = centre;
  osc.start(0);
  osc.stop(duration);
}

/**
 * Lay sparse events across the whole render window.
 *
 * Gaps are randomised so the ear never locks onto a period, but the sequence
 * is deterministic for a given seed.
 */
function scheduleEvents(
  seed: number,
  duration: number,
  minGap: number,
  maxGap: number,
  fire: (when: number) => void,
): void {
  const rand = seeded(seed);
  let t = rand() * maxGap;

  while (t < duration) {
    fire(t);
    t += minGap + rand() * (maxGap - minGap);
  }
}

/** A short filtered noise burst — the building block for most transients. */
function burst(
  ctx: BaseAudioContext,
  destination: AudioNode,
  options: {
    when: number;
    duration: number;
    frequency: number;
    q?: number;
    gain: number;
    type?: BiquadFilterType;
    color?: NoiseColor;
  },
): void {
  const { when } = options;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx, options.color ?? "white");
  source.loop = true;

  const band = filter(
    ctx,
    options.type ?? "bandpass",
    options.frequency,
    options.q ?? 8,
  );

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, when);
  envelope.gain.linearRampToValueAtTime(options.gain, when + options.duration * 0.15);
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + options.duration);

  source.connect(band);
  band.connect(envelope);
  envelope.connect(destination);

  source.start(when, (when * 7.31) % 3);
  source.stop(when + options.duration + 0.05);
}

/** A pitched tone with an envelope — chirps, hoots, whale calls. */
function tone(
  ctx: BaseAudioContext,
  destination: AudioNode,
  options: {
    when: number;
    startFreq: number;
    endFreq: number;
    duration: number;
    gain: number;
    type?: OscillatorType;
  },
): void {
  const { when } = options;
  const osc = ctx.createOscillator();
  osc.type = options.type ?? "sine";
  osc.frequency.setValueAtTime(options.startFreq, when);
  osc.frequency.exponentialRampToValueAtTime(
    Math.max(20, options.endFreq),
    when + options.duration,
  );

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, when);
  envelope.gain.linearRampToValueAtTime(options.gain, when + options.duration * 0.2);
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + options.duration);

  osc.connect(envelope);
  envelope.connect(destination);
  osc.start(when);
  osc.stop(when + options.duration + 0.05);
}

/** A steady noise bed: source → filter → gain → out. */
function bed(
  ctx: BaseAudioContext,
  out: AudioNode,
  duration: number,
  options: {
    color: NoiseColor;
    type?: BiquadFilterType;
    frequency: number;
    q?: number;
    gain: number;
  },
): { gain: GainNode; band: BiquadFilterNode } {
  const source = startNoise(ctx, options.color, duration);
  const band = filter(
    ctx,
    options.type ?? "lowpass",
    options.frequency,
    options.q ?? 1,
  );
  const gain = ctx.createGain();
  gain.gain.value = options.gain;

  source.connect(band);
  band.connect(gain);
  gain.connect(out);

  return { gain, band };
}

/* ── beds ────────────────────────────────────────────────────────────────── */

const BUILDERS: Record<string, BedBuilder> = {
  /** Light rain: a quiet airy wash, with the character in discrete drops. */
  rain: (ctx, out, d) => {
    const { gain } = bed(ctx, out, d, {
      color: "white",
      type: "highpass",
      frequency: 1400,
      gain: 0.1,
    });
    lfo(ctx, 0.05, 0.03, gain.gain, 0.1, d);

    scheduleEvents(11, d, 0.045, 0.19, (when) => {
      const r = seeded(Math.floor(when * 1000))();
      burst(ctx, out, {
        when,
        duration: 0.02 + r * 0.035,
        frequency: 1800 + r * 3200,
        q: 4,
        gain: 0.05 + r * 0.07,
      });
    });
  },

  /**
   * Distant thunder. Both bed and strikes sit in the low mids: on a phone the
   * weight of thunder comes from there, not from sub-bass the speaker drops.
   */
  thunder: (ctx, out, d) => {
    bed(ctx, out, d, { color: "brown", frequency: 620, gain: 0.12 });

    scheduleEvents(23, d, 7, 20, (when) => {
      const r = seeded(Math.floor(when * 97))();
      burst(ctx, out, {
        when,
        duration: 2.4 + r * 2,
        frequency: 260 + r * 220,
        q: 0.8,
        gain: 0.55,
        type: "lowpass",
        color: "brown",
      });
    });
  },

  "thunder-storm": (ctx, out, d) => {
    BUILDERS.rain(ctx, out, d);
    BUILDERS.thunder(ctx, out, d);
  },

  /** Gusts come from sweeping the filter, not from changing volume. */
  wind: (ctx, out, d) => {
    const { gain, band } = bed(ctx, out, d, {
      color: "pink",
      frequency: 700,
      q: 1.2,
      gain: 0.5,
    });
    lfo(ctx, 0.07, 420, band.frequency, 700, d);
    lfo(ctx, 0.11, 0.18, gain.gain, 0.5, d);
  },

  /** Open sea: slow swell rolling toward the listener. */
  wave: (ctx, out, d) => {
    const { gain, band } = bed(ctx, out, d, {
      color: "pink",
      frequency: 1100,
      gain: 0.4,
    });
    lfo(ctx, 0.1, 0.3, gain.gain, 0.4, d);
    lfo(ctx, 0.1, 500, band.frequency, 1100, d);
  },

  river: (ctx, out, d) => {
    const source = startNoise(ctx, "white", d);
    const high = filter(ctx, "highpass", 600);
    const low = filter(ctx, "lowpass", 4200);
    const gain = ctx.createGain();
    gain.gain.value = 0.32;

    source.connect(high);
    high.connect(low);
    low.connect(gain);
    gain.connect(out);

    lfo(ctx, 0.23, 0.05, gain.gain, 0.32, d);
  },

  /** Firelight: a soft body under irregular, bright crackles. */
  fire: (ctx, out, d) => {
    bed(ctx, out, d, { color: "pink", frequency: 700, gain: 0.18 });

    scheduleEvents(31, d, 0.09, 0.7, (when) => {
      const r = seeded(Math.floor(when * 613))();
      burst(ctx, out, {
        when,
        duration: 0.03 + r * 0.07,
        frequency: 1200 + r * 2600,
        q: 3,
        gain: 0.05 + r * 0.14,
      });
    });
  },

  /** Dawn chorus over a faint morning hiss. */
  birds: (ctx, out, d) => {
    bed(ctx, out, d, { color: "pink", frequency: 1200, gain: 0.05 });

    scheduleEvents(7, d, 0.9, 3.5, (when) => {
      const rand = seeded(Math.floor(when * 331));
      const notes = 2 + Math.floor(rand() * 3);
      const base = 2200 + rand() * 1800;

      for (let i = 0; i < notes; i++) {
        const up = rand() > 0.5;
        tone(ctx, out, {
          when: when + i * (0.07 + rand() * 0.09),
          startFreq: up ? base : base * 1.5,
          endFreq: up ? base * 1.5 : base * 0.8,
          duration: 0.09 + rand() * 0.08,
          gain: 0.08,
        });
      }
    });
  },

  /**
   * Crickets, as oscillators. Filtered noise through the narrow band a chirp
   * needs passes almost no energy, which is why the old version was silent.
   */
  crickets: (ctx, out, d) => {
    bed(ctx, out, d, { color: "pink", frequency: 900, gain: 0.05 });

    scheduleEvents(17, d, 0.6, 1.9, (when) => {
      const rand = seeded(Math.floor(when * 419));
      const base = 4200 + rand() * 800;
      const pulses = 3 + Math.floor(rand() * 3);

      for (let i = 0; i < pulses; i++) {
        tone(ctx, out, {
          when: when + i * 0.062,
          startFreq: base,
          endFreq: base * 0.97,
          duration: 0.05,
          gain: 0.14,
        });
      }
    });
  },

  /** Hoots, with only a whisper of night air behind them. */
  owl: (ctx, out, d) => {
    bed(ctx, out, d, { color: "pink", frequency: 1600, gain: 0.04 });

    scheduleEvents(29, d, 4.5, 11, (when) => {
      const base = 620 + seeded(Math.floor(when * 211))() * 120;
      tone(ctx, out, {
        when,
        startFreq: base,
        endFreq: base * 0.92,
        duration: 0.4,
        gain: 0.24,
      });
      tone(ctx, out, {
        when: when + 0.6,
        startFreq: base * 0.95,
        endFreq: base * 0.84,
        duration: 0.55,
        gain: 0.2,
      });
    });
  },

  /**
   * Purr plus soft meows. A triangle through a formant-ish band gives the call
   * its shape; a sawtooth read as an electronic buzz on a small speaker.
   */
  cat: (ctx, out, d) => {
    const { gain } = bed(ctx, out, d, {
      color: "pink",
      frequency: 1100,
      gain: 0.16,
    });

    // ~26Hz amplitude pulses are what make a purr read as a purr.
    const pulse = ctx.createOscillator();
    pulse.type = "sine";
    pulse.frequency.value = 26;
    const pulseDepth = ctx.createGain();
    pulseDepth.gain.value = 0.1;
    pulse.connect(pulseDepth);
    pulseDepth.connect(gain.gain);
    pulse.start(0);
    pulse.stop(d);

    const voice = filter(ctx, "bandpass", 900, 1.6);
    voice.connect(out);

    scheduleEvents(41, d, 7, 18, (when) => {
      const base = 440 + seeded(Math.floor(when * 157))() * 160;
      tone(ctx, voice, {
        when,
        startFreq: base * 0.85,
        endFreq: base,
        duration: 0.26,
        gain: 0.22,
        type: "triangle",
      });
      tone(ctx, voice, {
        when: when + 0.24,
        startFreq: base,
        endFreq: base * 0.7,
        duration: 0.5,
        gain: 0.2,
        type: "triangle",
      });
    });
  },

  /** Whale song. An octave above the original, which fell below audibility. */
  whale: (ctx, out, d) => {
    bed(ctx, out, d, { color: "brown", frequency: 520, gain: 0.2 });

    scheduleEvents(13, d, 4, 9, (when) => {
      const rand = seeded(Math.floor(when * 271));
      const base = 420 + rand() * 320;

      tone(ctx, out, {
        when,
        startFreq: base,
        endFreq: base * (0.55 + rand() * 0.2),
        duration: 1.8 + rand() * 1.6,
        gain: 0.2,
      });
      tone(ctx, out, {
        when: when + 2.2,
        startFreq: base * 0.62,
        endFreq: base * 0.9,
        duration: 1.1,
        gain: 0.14,
      });
    });
  },

  /** Rolling stock: a steady body under the two-beat clack of rail joints. */
  train: (ctx, out, d) => {
    const { gain } = bed(ctx, out, d, {
      color: "brown",
      frequency: 520,
      gain: 0.42,
    });
    lfo(ctx, 0.09, 0.07, gain.gain, 0.42, d);

    scheduleEvents(37, d, 1.4, 1.7, (when) => {
      burst(ctx, out, { when, duration: 0.06, frequency: 900, q: 2, gain: 0.09 });
      burst(ctx, out, {
        when: when + 0.19,
        duration: 0.06,
        frequency: 780,
        q: 2,
        gain: 0.07,
      });
    });
  },

  "night-forest": (ctx, out, d) => {
    BUILDERS.crickets(ctx, out, d);
    BUILDERS.owl(ctx, out, d);
    bed(ctx, out, d, { color: "pink", frequency: 900, gain: 0.05 });
  },
};

/* ── public API ──────────────────────────────────────────────────────────── */

export function canSynthesise(ambientId: string): boolean {
  return ambientId in BUILDERS;
}

/**
 * Returns a builder that lays the named bed into `out`, wrapped in the
 * high-pass every bed shares.
 *
 * The guard is not cosmetic: brown-noise beds stacked across the catalogue
 * produced a constant low rumble that muddied everything and buried the
 * character sounds — the owl's hoots were lost under their own bed. A phone
 * cannot render that energy anyway.
 */
export function buildBed(ambientId: string): BedBuilder | null {
  const build = BUILDERS[ambientId];
  if (build === undefined) return null;

  return (ctx, out, duration) => {
    const first = ctx.createBiquadFilter();
    first.type = "highpass";
    first.frequency.value = 150;
    first.Q.value = 0.7;

    const second = ctx.createBiquadFilter();
    second.type = "highpass";
    second.frequency.value = 150;
    second.Q.value = 0.7;

    first.connect(second);
    second.connect(out);

    build(ctx, first, duration);
  };
}
