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
    // Steady hiss plus a slower body, with gentle intensity drift.
    const hiss = startNoise(ctx, "white");
    const hissBand = filter(ctx, "highpass", 900);
    const hissTop = filter(ctx, "lowpass", 9000);
    const hissGain = ctx.createGain();
    hissGain.gain.value = 0.35;

    const body = startNoise(ctx, "pink");
    const bodyBand = filter(ctx, "lowpass", 700);
    const bodyGain = ctx.createGain();
    bodyGain.gain.value = 0.5;

    const drift = lfo(ctx, 0.05, 0.08, hissGain.gain, 0.35);

    hiss.connect(hissBand);
    hissBand.connect(hissTop);
    hissTop.connect(hissGain);
    hissGain.connect(out);

    body.connect(bodyBand);
    bodyBand.connect(bodyGain);
    bodyGain.connect(out);

    return () => {
      hiss.stop();
      body.stop();
      drift.stop();
    };
  },

  thunder: (ctx, out) => {
    const rumble = startNoise(ctx, "brown");
    const low = filter(ctx, "lowpass", 180);
    const gain = ctx.createGain();
    gain.gain.value = 0.18;
    rumble.connect(low);
    low.connect(gain);
    gain.connect(out);

    const cancel = scheduler(7000, 20000, () => {
      burst(ctx, out, {
        duration: 2.5 + Math.random() * 2,
        frequency: 60 + Math.random() * 60,
        q: 0.7,
        gain: 0.5,
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
    const bed = startNoise(ctx, "pink");
    const low = filter(ctx, "lowpass", 300);
    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.08;
    bed.connect(low);
    low.connect(bedGain);
    bedGain.connect(out);

    // A chirp is a rapid train of very short bursts around 4-5kHz.
    const cancel = scheduler(700, 2200, () => {
      const base = 3800 + Math.random() * 1400;
      const pulses = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < pulses; i++) {
        setTimeout(
          () =>
            burst(ctx, out, {
              duration: 0.035,
              frequency: base,
              q: 26,
              gain: 0.1,
            }),
          i * 55,
        );
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
    const bed = startNoise(ctx, "brown");
    const low = filter(ctx, "lowpass", 260);
    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.12;
    bed.connect(low);
    low.connect(bedGain);
    bedGain.connect(out);

    // Two-note hoot, occasionally.
    const cancel = scheduler(5000, 14000, () => {
      const base = 330 + Math.random() * 70;
      tone(ctx, out, { startFreq: base, endFreq: base * 0.92, duration: 0.45, gain: 0.12 });
      setTimeout(
        () =>
          tone(ctx, out, {
            startFreq: base * 0.96,
            endFreq: base * 0.85,
            duration: 0.6,
            gain: 0.1,
          }),
        620,
      );
    });

    return () => {
      bed.stop();
      cancel();
    };
  },

  cat: (ctx, out) => {
    // A purr: low pulses at roughly 25Hz, which is what a purr actually is.
    const noise = startNoise(ctx, "brown");
    const low = filter(ctx, "lowpass", 220);
    const gain = ctx.createGain();
    gain.gain.value = 0.25;

    const pulse = ctx.createOscillator();
    pulse.type = "square";
    pulse.frequency.value = 25;
    const pulseDepth = ctx.createGain();
    pulseDepth.gain.value = 0.12;
    pulse.connect(pulseDepth);
    pulseDepth.connect(gain.gain);
    pulse.start(0);

    const breathe = lfo(ctx, 0.15, 0.08, low.frequency, 220);

    noise.connect(low);
    low.connect(gain);
    gain.connect(out);

    return () => {
      noise.stop();
      pulse.stop();
      breathe.stop();
    };
  },

  whale: (ctx, out) => {
    const bed = startNoise(ctx, "brown");
    const low = filter(ctx, "lowpass", 200);
    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.16;
    bed.connect(low);
    low.connect(bedGain);
    bedGain.connect(out);

    // Long descending calls.
    const cancel = scheduler(6000, 15000, () => {
      const base = 180 + Math.random() * 220;
      tone(ctx, out, {
        startFreq: base,
        endFreq: base * (0.4 + Math.random() * 0.3),
        duration: 1.6 + Math.random() * 1.8,
        gain: 0.11,
      });
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
  const teardown = build(ctx, output);

  return {
    output,
    stop() {
      teardown();
      output.disconnect();
    },
  };
}
