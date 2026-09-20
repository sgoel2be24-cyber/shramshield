import { describe, expect, it } from 'vitest';
import { computeWbgt, estimatedGlobeTemp, psychrometricWetBulb, WBGT_WEIGHTS } from './wbgt';

/**
 * Tolerance for the saturation property. Stull (2011) is explicitly approximate near
 * saturation, so this asserts the physical behaviour, not exactness.
 */
const SATURATION_TOLERANCE_C = 0.7;

describe('psychrometricWetBulb — Stull (2011) closed form', () => {
  it('equals the dry-bulb temperature at 100% relative humidity', () => {
    for (const dryBulb of [5, 15, 25, 35, 42]) {
      expect(Math.abs(psychrometricWetBulb(dryBulb, 100) - dryBulb)).toBeLessThan(
        SATURATION_TOLERANCE_C,
      );
    }
  });

  it('sits below the dry-bulb temperature when the air is unsaturated', () => {
    expect(psychrometricWetBulb(35, 60)).toBeLessThan(35);
    expect(psychrometricWetBulb(30, 50)).toBeLessThan(30);
  });

  it('increases monotonically with humidity at a fixed dry-bulb temperature', () => {
    let previous = Number.NEGATIVE_INFINITY;
    for (const rh of [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) {
      const value = psychrometricWetBulb(35, rh);
      expect(value).toBeGreaterThan(previous);
      previous = value;
    }
  });

  it('reproduces pinned values from the closed form (reproduce with scripts/pin_wetbulb.py)', () => {
    const pinned: [number, number, number][] = [
      [20, 50, 13.6993],
      [30, 50, 22.2968],
      [35, 60, 28.4883],
      [42, 50, 32.6133],
      [25, 80, 22.3295],
      [38, 25, 22.9599],
      [15, 95, 14.4077],
    ];
    for (const [dryBulb, rh, expected] of pinned) {
      expect(psychrometricWetBulb(dryBulb, rh)).toBeCloseTo(expected, 3);
    }
  });

  it('clamps out-of-range humidity instead of producing NaN', () => {
    expect(Number.isFinite(psychrometricWetBulb(30, 0))).toBe(true);
    expect(Number.isFinite(psychrometricWetBulb(30, 150))).toBe(true);
    expect(Number.isFinite(psychrometricWetBulb(30, -20))).toBe(true);
  });
});

describe('estimatedGlobeTemp', () => {
  it('equals the dry-bulb temperature with no solar load — physically required', () => {
    expect(estimatedGlobeTemp(30, 0, 0)).toBe(30);
    expect(estimatedGlobeTemp(30, 0, 5)).toBe(30);
  });

  it('rises with shortwave radiation and falls with wind', () => {
    expect(estimatedGlobeTemp(32, 900, 1)).toBeGreaterThan(estimatedGlobeTemp(32, 300, 1));
    expect(estimatedGlobeTemp(32, 800, 0.5)).toBeGreaterThan(estimatedGlobeTemp(32, 800, 5));
  });

  it('clamps hostile input rather than extrapolating nonsense', () => {
    expect(estimatedGlobeTemp(30, -50, 1)).toBe(30);
    expect(Number.isFinite(estimatedGlobeTemp(30, 5000, 1))).toBe(true);
    expect(Number.isFinite(estimatedGlobeTemp(30, 800, -3))).toBe(true);
  });
});

describe('computeWbgt', () => {
  it('weights sum to one', () => {
    const total = WBGT_WEIGHTS.naturalWetBulb + WBGT_WEIGHTS.globe + WBGT_WEIGHTS.dryBulb;
    expect(total).toBeCloseTo(1, 10);
  });

  it('rises with humidity at a fixed dry-bulb temperature — the gap dry-bulb alerts cannot see', () => {
    const dryDay = computeWbgt({ dryBulbC: 33, relativeHumidity: 30, windMs: 1, solarWm2: 700 });
    const humidDay = computeWbgt({ dryBulbC: 33, relativeHumidity: 85, windMs: 1, solarWm2: 700 });
    expect(humidDay.wbgtC).toBeGreaterThan(dryDay.wbgtC + 3);
    // Same thermometer reading, materially different heat strain.
    expect(humidDay.dryBulbC).toBe(dryDay.dryBulbC);
  });

  it('drops as wind rises, which is the only cooling a worksite can add on the spot', () => {
    const still = computeWbgt({ dryBulbC: 36, relativeHumidity: 40, windMs: 0.2, solarWm2: 800 });
    const breezy = computeWbgt({ dryBulbC: 36, relativeHumidity: 40, windMs: 4, solarWm2: 800 });
    expect(breezy.wbgtC).toBeLessThan(still.wbgtC);
  });

  it('reproduces the pinned Delhi midday hour of the bundled forecast', () => {
    // Real hour: Delhi 2026-09-20 14:00 IST — 33.6 C, 48% RH, 0.3 m/s, 657 W/m2.
    const wbgt = computeWbgt({ dryBulbC: 33.6, relativeHumidity: 48, windMs: 0.3, solarWm2: 657 });
    expect(wbgt.wbgtC).toBeCloseTo(28.7, 1);
  });

  it('never returns NaN, and always flags its globe/wet-bulb terms as estimated', () => {
    const degenerate = computeWbgt({ dryBulbC: 40, relativeHumidity: 0, windMs: -3, solarWm2: -10 });
    expect(degenerate.estimated).toBe(true);
    for (const value of [degenerate.wbgtC, degenerate.wetBulbC, degenerate.globeC, degenerate.dryBulbC]) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });
});
