import { describe, expect, it } from "vitest";
import { DomainEventName } from "../shared/domain-event";
import { AmbientMix } from "./ambient-mix.aggregate";
import { AmbientSound } from "./ambient-sound.entity";

describe("AmbientMix.select", () => {
  it("replaces the whole mix", () => {
    const mix = AmbientMix.empty();
    mix.select("rain");
    mix.select("fire");

    expect(mix.activeLayers).toHaveLength(1);
    expect(mix.primaryAmbientId).toBe("fire");
  });

  it("clears the mix when selecting the none sentinel", () => {
    const mix = AmbientMix.empty();
    mix.select("rain");
    mix.select(AmbientSound.NONE_ID);

    expect(mix.isEmpty).toBe(true);
    expect(mix.primaryAmbientId).toBeNull();
  });

  it("emits AmbientChanged", () => {
    const mix = AmbientMix.empty();
    mix.select("rain");
    expect(mix.pullEvents().map((e) => e.name)).toContain(
      DomainEventName.AmbientChanged,
    );
  });
});

describe("AmbientMix layering", () => {
  it("caps the mix at three layers", () => {
    const mix = AmbientMix.empty();
    expect(mix.addLayer("rain").ok).toBe(true);
    expect(mix.addLayer("fire").ok).toBe(true);
    expect(mix.addLayer("wind").ok).toBe(true);

    const fourth = mix.addLayer("waves");
    expect(fourth.ok).toBe(false);
    if (!fourth.ok) expect(fourth.error.code).toBe("ambient_mix.too_many_layers");
  });

  it("rejects a duplicate layer", () => {
    const mix = AmbientMix.empty();
    mix.addLayer("rain");
    const again = mix.addLayer("rain");
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.code).toBe("ambient_mix.duplicate_layer");
  });

  it("refuses to layer the none sentinel", () => {
    const mix = AmbientMix.empty();
    const result = mix.addLayer(AmbientSound.NONE_ID);
    expect(result.ok).toBe(false);
  });

  it("rejects removing a layer that is not present", () => {
    const mix = AmbientMix.empty();
    expect(mix.removeLayer("rain").ok).toBe(false);
  });

  it("removes an existing layer", () => {
    const mix = AmbientMix.empty();
    mix.addLayer("rain");
    mix.addLayer("fire");
    expect(mix.removeLayer("rain").ok).toBe(true);
    expect(mix.has("rain")).toBe(false);
    expect(mix.has("fire")).toBe(true);
  });

  it("clamps a layer level into 0..1", () => {
    const mix = AmbientMix.empty();
    mix.addLayer("rain", 5);
    expect(mix.activeLayers[0].level).toBe(1);

    mix.setLayerLevel("rain", -2);
    expect(mix.activeLayers[0].level).toBe(0);
  });
});

describe("AmbientMix.effectiveGains", () => {
  it("returns no gains for an empty mix", () => {
    expect(AmbientMix.empty().effectiveGains(1).size).toBe(0);
  });

  it("scales a single layer by the master level", () => {
    const mix = AmbientMix.empty();
    mix.select("rain", 0.5);
    expect(mix.effectiveGains(0.5).get("rain")).toBeCloseTo(0.25, 5);
  });

  it("shares the budget so stacking layers is not additive", () => {
    const single = AmbientMix.empty();
    single.addLayer("rain", 1);
    const singleGain = single.effectiveGains(1).get("rain") ?? 0;

    const triple = AmbientMix.empty();
    triple.addLayer("rain", 1);
    triple.addLayer("fire", 1);
    triple.addLayer("wind", 1);
    const tripleGain = triple.effectiveGains(1).get("rain") ?? 0;

    expect(tripleGain).toBeLessThan(singleGain);
  });
});
