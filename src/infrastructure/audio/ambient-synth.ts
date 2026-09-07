/**
 * Procedural ambient sound.
 *
 * Ambient beds are synthesised from noise, filters and LFOs rather than
 * streamed from audio files. For this app that is strictly better:
 *
 *  - nothing to download, so a background bed starts instantly and works
 *    offline from the first launch
 *  - there is no loop point at all, so an hour-long session never develops
 *    the tell-tale 30-second seam that ruins a calm bed
 *  - no third-party audio, so no licence to track or get wrong
 *
 * Each generator returns a handle that owns its nodes and timers, so stopping
 * a layer tears down everything it created.
 */

export interface AmbientSourceHandle {
  /** Node the caller connects to its own gain stage. */
  readonly output: GainNode;
  stop(): void;
}

/** Reusable noise buffers — generating these is the expensive part. */
const noiseCache = new Map<string, AudioBuffer>();

type NoiseColor = "white" | "pink" | "brown";

function noiseBuffer(ctx: AudioContext, color: NoiseColor): AudioBuffer {
  const cached = noiseCache.get(color);
  if (cached !== undefined) return cached;

  // 4 seconds is long enough that the noise loop is not perceptible.
  const length = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (color === "white") {
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  } else if (color === "pink") {
    // Paul Kellet's economical pink noise approximation.
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
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
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  }

  noiseCache.set(color, buffer);
  return buffer;
}

function startNoise(ctx: AudioContext, color: NoiseColor): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx, color);
  source.loop = true;
  source.start(0);
  return source;
}

function filter(
  ctx: AudioContext,
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

/** Slow oscillator used for gusts, swells and shimmer. */
function lfo(
  ctx: AudioContext,
  rateHz: number,
  depth: number,
  target: AudioParam,
  centre: number,
): OscillatorNode {
  const osc = ctx.createOscillator();
  osc.frequency.value = rateHz;
  const gain = ctx.createGain();
  gain.gain.value = depth;
  osc.connect(gain);
  gain.connect(target);
  target.value = centre;
  osc.start(0);
  return osc;
}

/**
 * Schedules sparse one-off events (a crackle, a chirp, a distant roll).
 * Intervals are randomised so the ear never locks onto a pattern.
 */
function scheduler(
  minMs: number,
  maxMs: number,
  fire: () => void,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const loop = () => {
    if (stopped) return;
    fire();
    timer = setTimeout(loop, minMs + Math.random() * (maxMs - minMs));
  };

  timer = setTimeout(loop, Math.random() * maxMs);

  return () => {
    stopped = true;
    if (timer !== null) clearTimeout(timer);
  };
}

/** A short filtered noise burst — the building block for most transients. */
function burst(
  ctx: AudioContext,
  destination: AudioNode,
  options: {
    duration: number;
    frequency: number;
    q?: number;
    gain: number;
    type?: BiquadFilterType;
    color?: NoiseColor;
  },
): void {
  const now = ctx.currentTime;
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
  envelope.gain.setValueAtTime(0, now);
  envelope.gain.linearRampToValueAtTime(options.gain, now + options.duration * 0.15);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + options.duration);

  source.connect(band);
  band.connect(envelope);
  envelope.connect(destination);

  source.start(now, Math.random() * 3);
  source.stop(now + options.duration + 0.05);
}

/** A pitched tone with an envelope — hoots, chirps, whale calls. */
function tone(
  ctx: AudioContext,
  destination: AudioNode,
  options: {
    startFreq: number;
    endFreq: number;
    duration: number;
    gain: number;
    type?: OscillatorType;
  },
): void {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = options.type ?? "sine";
  osc.frequency.setValueAtTime(options.startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(
    Math.max(20, options.endFreq),
    now + options.duration,
  );

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, now);
  envelope.gain.linearRampToValueAtTime(options.gain, now + options.duration * 0.2);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + options.duration);

  osc.connect(envelope);
  envelope.connect(destination);
  osc.start(now);
  osc.stop(now + options.duration + 0.05);
}

type Builder = (ctx: AudioContext, out: GainNode) => () => void;

const BUILDERS: Record<string, Builder> = {
  rain: (ctx, out) => {
    /*
     * Light rain — a patter, not a downpour.
     *
     * The previous bed was a broad, loud wash that read as heavy rain on a
     * roof. Gentle rain is mostly *individual drops*: a quiet airy bed with
     * discrete little impacts on top. So the wash is dialled well back and
     * the character now comes from scheduled droplets.
     */
    const hiss = startNoise(ctx, "white");
    const hissBand = filter(ctx, "highpass", 1400);
    const hissTop = filter(ctx, "lowpass", 7000);
    const hissGain = ctx.createGain();
    hissGain.gain.value = 0.1;

    const drift = lfo(ctx, 0.05, 0.03, hissGain.gain, 0.1);

    hiss.connect(hissBand);
    hissBand.connect(hissTop);
    hissTop.connect(hissGain);
    hissGain.connect(out);

    // Droplets: short, bright, irregular. These carry the identity.
    const cancel = scheduler(45, 190, () => {
      burst(ctx, out, {
        duration: 0.02 + Math.random() * 0.035,
        frequency: 1800 + Math.random() * 3200,
        q: 4,
        gain: 0.05 + Math.random() * 0.07,
      });
    });

    return () => {
      hiss.stop();
      drift.stop();
      cancel();
    };
  },

  thunder: (ctx, out) => {
    /*
     * Distant thunder.
     *
     * Both the bed and the strikes used to live under ~180Hz, which the
     * output high-pass now removes and a phone speaker never reproduced in
     * the first place. They are moved up into the range that actually carries
     * the impression of a roll — the weight of thunder on a small speaker
     * comes from the low mids, not from sub-bass.
     */
    const rumble = startNoise(ctx, "brown");
    const low = filter(ctx, "lowpass", 620);
    const gain = ctx.createGain();
    gain.gain.value = 0.12;
    rumble.connect(low);
    low.connect(gain);
    gain.connect(out);

    const cancel = scheduler(7000, 20000, () => {
      burst(ctx, out, {
        duration: 2.4 + Math.random() * 2,
        frequency: 260 + Math.random() * 220,
        q: 0.8,
        gain: 0.55,
        type: "lowpass",
        color: "brown",
      });
    });

    return () => {
      rumble.stop();
      cancel();
    };
  },

  "thunder-storm": (ctx, out) => {
    const stopRain = BUILDERS.rain(ctx, out);
    const stopThunder = BUILDERS.thunder(ctx, out);
    return () => {
      stopRain();
      stopThunder();
    };
  },

  wind: (ctx, out) => {
    // Gusts come from sweeping the filter, not from changing volume.
    const noise = startNoise(ctx, "brown");
    const band = filter(ctx, "lowpass", 600, 1.2);
    const gain = ctx.createGain();
    gain.gain.value = 0.55;

    const sweep = lfo(ctx, 0.07, 420, band.frequency, 700);
    const swell = lfo(ctx, 0.11, 0.18, gain.gain, 0.5);

    noise.connect(band);
    band.connect(gain);
    gain.connect(out);

    return () => {
      noise.stop();
      sweep.stop();
      swell.stop();
    };
  },

  wave: (ctx, out) => {
    const noise = startNoise(ctx, "brown");
    const band = filter(ctx, "lowpass", 1100);
    const gain = ctx.createGain();
    gain.gain.value = 0.4;

    // Slow swell in and out, roughly one wave every ten seconds.
    const swell = lfo(ctx, 0.1, 0.3, gain.gain, 0.4);
    const shimmer = lfo(ctx, 0.1, 500, band.frequency, 1100);

    noise.connect(band);
    band.connect(gain);
    gain.connect(out);

    return () => {
      noise.stop();
      swell.stop();
      shimmer.stop();
    };
  },

  river: (ctx, out) => {
    const noise = startNoise(ctx, "white");
    const high = filter(ctx, "highpass", 500);
    const low = filter(ctx, "lowpass", 4200);
    const gain = ctx.createGain();
    gain.gain.value = 0.32;
    const burble = lfo(ctx, 0.23, 0.05, gain.gain, 0.32);

    noise.connect(high);
    high.connect(low);
    low.connect(gain);
    gain.connect(out);

    return () => {
      noise.stop();
      burble.stop();
    };
  },

  fire: (ctx, out) => {
    const bed = startNoise(ctx, "brown");
    const low = filter(ctx, "lowpass", 500);
    const gain = ctx.createGain();
    gain.gain.value = 0.3;
    bed.connect(low);
    low.connect(gain);
    gain.connect(out);

    // Crackles: short, bright, irregular.
    const cancel = scheduler(90, 700, () => {
      burst(ctx, out, {
        duration: 0.03 + Math.random() * 0.07,
        frequency: 1200 + Math.random() * 2600,
        q: 3,
        gain: 0.05 + Math.random() * 0.14,
      });
    });

    return () => {
      bed.stop();
      cancel();
    };
  },

  crickets: (ctx, out) => {
    /*
     * Chirps from an oscillator, not filtered noise.
     *
     * The old version pushed noise through a Q-26 bandpass. That filter is so
     * narrow it passes almost none of a broadband source, so the chirps were
     * effectively silent however high the gain went. A real cricket
     * stridulates close to a pure tone, so an oscillator is both louder and
     * more accurate.
     */
    const bed = startNoise(ctx, "pink");
    const low = filter(ctx, "lowpass", 900);
    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.05;
    bed.connect(low);
    low.connect(bedGain);
    bedGain.connect(out);

    const cancel = scheduler(600, 1900, () => {
      const base = 4200 + Math.random() * 800;
      const pulses = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < pulses; i++) {
        setTimeout(() => {
          tone(ctx, out, {
            startFreq: base,
            endFreq: base * 0.97,
            duration: 0.05,
            gain: 0.14,
          });
        }, i * 62);
      }
    });

    return () => {
      bed.stop();
      cancel();
    };
  },

  birds: (ctx, out) => {
    const bed = startNoise(ctx, "pink");
    const low = filter(ctx, "lowpass", 900);
    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.05;
    bed.connect(low);
    low.connect(bedGain);
    bedGain.connect(out);

    const cancel = scheduler(900, 3500, () => {
      const notes = 2 + Math.floor(Math.random() * 3);
      const base = 2200 + Math.random() * 1800;
      for (let i = 0; i < notes; i++) {
        setTimeout(() => {
          const up = Math.random() > 0.5;
          tone(ctx, out, {
            startFreq: up ? base : base * 1.5,
            endFreq: up ? base * 1.5 : base * 0.8,
            duration: 0.09 + Math.random() * 0.08,
            gain: 0.06,
          });
        }, i * (70 + Math.random() * 90));
      }
    });

    return () => {
      bed.stop();
      cancel();
    };
  },

  owl: (ctx, out) => {
    /*
     * Hoots, with only a whisper of night air behind them.
     *
     * The bed was brown noise under a 260Hz lowpass at four times this gain —
     * pure rumble, and loud enough to bury the hoots it was meant to sit
     * behind. The bed is now quiet and airy, and the calls are the loudest
     * thing here, as they should be.
     */
    const bed = startNoise(ctx, "pink");
    const low = filter(ctx, "lowpass", 1600);
    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.04;
    bed.connect(low);
    low.connect(bedGain);
    bedGain.connect(out);

    // A tawny owl's two-part call, an octave up from the old version so a
    // phone speaker can actually render it.
    const cancel = scheduler(4500, 11000, () => {
      const base = 620 + Math.random() * 120;
      tone(ctx, out, {
        startFreq: base,
        endFreq: base * 0.92,
        duration: 0.4,
        gain: 0.24,
      });
      setTimeout(
        () =>
          tone(ctx, out, {
            startFreq: base * 0.95,
            endFreq: base * 0.84,
            duration: 0.55,
            gain: 0.2,
          }),
        600,
      );
    });

    return () => {
      bed.stop();
      cancel();
    };
  },

  cat: (ctx, out) => {
    /*
     * Purr plus soft meows.
     *
     * The first attempt used a sawtooth, which on a small speaker reads as an
     * electronic buzz rather than an animal. A triangle carries far less
     * upper-harmonic energy, and a gentle bandpass around the vowel region
     * gives the call its shape without the rasp.
     */
    const noise = startNoise(ctx, "pink");
    const body = filter(ctx, "lowpass", 1100);
    const gain = ctx.createGain();
    gain.gain.value = 0.16;

    // ~26Hz amplitude pulses are what makes a purr read as a purr.
    const pulse = ctx.createOscillator();
    pulse.type = "sine";
    pulse.frequency.value = 26;
    const pulseDepth = ctx.createGain();
    pulseDepth.gain.value = 0.1;
    pulse.connect(pulseDepth);
    pulseDepth.connect(gain.gain);
    pulse.start(0);

    noise.connect(body);
    body.connect(gain);
    gain.connect(out);

    // Shape the meow through a formant-ish band so it sounds voiced.
    const voice = filter(ctx, "bandpass", 900, 1.6);
    voice.connect(out);

    const cancel = scheduler(7000, 18000, () => {
      const base = 440 + Math.random() * 160;
      tone(ctx, voice, {
        startFreq: base * 0.85,
        endFreq: base,
        duration: 0.26,
        gain: 0.22,
        type: "triangle",
      });
      setTimeout(
        () =>
          tone(ctx, voice, {
            startFreq: base,
            endFreq: base * 0.7,
            duration: 0.5,
            gain: 0.2,
            type: "triangle",
          }),
        240,
      );
    });

    return () => {
      noise.stop();
      pulse.stop();
      cancel();
      voice.disconnect();
    };
  },

  whale: (ctx, out) => {
    /*
     * Whale song over deep water.
     *
     * The calls previously started near 180Hz and glided down to ~70Hz, which
     * a phone speaker cannot reproduce — the sound existed but could not be
     * heard. They now sit an octave higher, where the instrument is audible,
     * and the calls are frequent and loud enough to actually register.
     */
    const bed = startNoise(ctx, "brown");
    const low = filter(ctx, "lowpass", 420);
    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.2;
    bed.connect(low);
    low.connect(bedGain);
    bedGain.connect(out);

    const cancel = scheduler(4000, 9000, () => {
      const base = 420 + Math.random() * 320;
      // A long descending moan, then a shorter answering rise.
      tone(ctx, out, {
        startFreq: base,
        endFreq: base * (0.55 + Math.random() * 0.2),
        duration: 1.8 + Math.random() * 1.6,
        gain: 0.2,
      });
      setTimeout(
        () =>
          tone(ctx, out, {
            startFreq: base * 0.62,
            endFreq: base * 0.9,
            duration: 1.1,
            gain: 0.14,
          }),
        2200,
      );
    });

    return () => {
      bed.stop();
      cancel();
    };
  },

  train: (ctx, out) => {
    const rumble = startNoise(ctx, "brown");
    const low = filter(ctx, "lowpass", 320);
    const gain = ctx.createGain();
    gain.gain.value = 0.42;
    const sway = lfo(ctx, 0.09, 0.07, gain.gain, 0.42);

    rumble.connect(low);
    low.connect(gain);
    gain.connect(out);

    // Rail joints: a steady two-beat clack.
    const cancel = scheduler(1400, 1700, () => {
      burst(ctx, out, { duration: 0.06, frequency: 900, q: 2, gain: 0.09 });
      setTimeout(
        () => burst(ctx, out, { duration: 0.06, frequency: 780, q: 2, gain: 0.07 }),
        190,
      );
    });

    return () => {
      rumble.stop();
      sway.stop();
      cancel();
    };
  },

  "night-forest": (ctx, out) => {
    const stopCrickets = BUILDERS.crickets(ctx, out);
    const stopWind = BUILDERS.wind(ctx, out);
    const stopOwl = BUILDERS.owl(ctx, out);
    return () => {
      stopCrickets();
      stopWind();
      stopOwl();
    };
  },
};

export function canSynthesise(ambientId: string): boolean {
  return ambientId in BUILDERS;
}

/**
 * Build and start an ambient bed. The returned handle's `output` is silent
 * until the caller ramps it — the mixer owns the fade.
 */
export function createAmbientSource(
  ctx: AudioContext,
  ambientId: string,
): AmbientSourceHandle | null {
  const build = BUILDERS[ambientId];
  if (build === undefined) return null;

  const output = ctx.createGain();
  output.gain.value = 0;

  /*
   * Every bed passes through a high-pass before it leaves.
   *
   * Most generators use a noise bed to suggest air or water, and brown noise
   * piles its energy into the bottom octaves. Stacked across the catalogue
   * that read as a constant low rumble that muddied everything and masked the
   * character sounds — the owl's hoots were audibly buried under their own
   * bed.
   *
   * A phone speaker cannot reproduce much below ~150Hz anyway; it only turns
   * that energy into cone excursion and distortion. Removing it costs nothing
   * audible and clears the mud. Two poles, so the slope is gentle enough not
   * to thin out thunder.
   */
  const rumbleGuard = ctx.createBiquadFilter();
  rumbleGuard.type = "highpass";
  rumbleGuard.frequency.value = 150;
  rumbleGuard.Q.value = 0.7;

  const stage2 = ctx.createBiquadFilter();
  stage2.type = "highpass";
  stage2.frequency.value = 150;
  stage2.Q.value = 0.7;

  const inner = ctx.createGain();
  const teardown = build(ctx, inner);

  inner.connect(rumbleGuard);
  rumbleGuard.connect(stage2);
  stage2.connect(output);

  return {
    output,
    stop() {
      teardown();
      inner.disconnect();
      rumbleGuard.disconnect();
      stage2.disconnect();
      output.disconnect();
    },
  };
}
