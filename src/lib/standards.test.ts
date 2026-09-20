import { describe, expect, it } from 'vitest';
import {
  ABSOLUTE_STOP_WBGT_C,
  ACCLIMATISED_LIMITS,
  ALLOCATION_BANDS,
  UNACCLIMATISED_LIMITS,
  WORK_CATEGORIES,
  allocateWorkRest,
  waterMlPerHour,
  type WorkCategory,
} from './standards';

describe('standards tables are recorded verbatim', () => {
  it('reproduces published acclimatised screening values', () => {
    expect(ACCLIMATISED_LIMITS['75-100% work']?.moderate).toBe(28.0);
    expect(ACCLIMATISED_LIMITS['50-75% work']?.moderate).toBe(29.0);
    expect(ACCLIMATISED_LIMITS['25-50% work']?.moderate).toBe(30.0);
    expect(ACCLIMATISED_LIMITS['0-25% work']?.moderate).toBe(31.5);
    expect(ACCLIMATISED_LIMITS['50-75% work']?.heavy).toBe(27.5);
    expect(ACCLIMATISED_LIMITS['0-25% work']?.veryHeavy).toBe(30.0);
  });

  it('reproduces published unacclimatised action limits', () => {
    expect(UNACCLIMATISED_LIMITS['75-100% work']?.moderate).toBe(25.0);
    expect(UNACCLIMATISED_LIMITS['50-75% work']?.moderate).toBe(26.0);
    expect(UNACCLIMATISED_LIMITS['0-25% work']?.veryHeavy).toBe(27.0);
  });

  it('publishes no limit for heavy or very heavy continuous work, as the standard does not', () => {
    expect(ACCLIMATISED_LIMITS['75-100% work']?.heavy).toBeNull();
    expect(ACCLIMATISED_LIMITS['75-100% work']?.veryHeavy).toBeNull();
    expect(UNACCLIMATISED_LIMITS['50-75% work']?.veryHeavy).toBeNull();
  });

  it('is monotone across bands: allowing less work permits more heat', () => {
    for (const category of ['light', 'moderate', 'heavy', 'veryHeavy'] as WorkCategory[]) {
      const limits = ALLOCATION_BANDS
        .map((band) => ACCLIMATISED_LIMITS[band.label]?.[category] ?? null)
        .filter((value): value is number => value !== null);
      for (let i = 1; i < limits.length; i += 1) {
        expect(limits[i] ?? 0).toBeGreaterThanOrEqual(limits[i - 1] ?? 0);
      }
    }
  });

  it('carries a metabolic rate for every category', () => {
    for (const category of WORK_CATEGORIES) {
      expect(category.metabolicRateW).toBeGreaterThan(0);
    }
  });
});

describe('allocateWorkRest', () => {
  it('permits the 75-100% band just under the continuous-work limit', () => {
    const allocation = allocateWorkRest(27.9, 'moderate', true);
    expect(allocation.band).toBe('75-100% work');
    expect(allocation.workMinutesPerHour).toBe(53);
    expect(allocation.restMinutesPerHour).toBe(7);
    expect(allocation.mustStopWork).toBe(false);
  });

  it('steps down through the bands as heat rises', () => {
    expect(allocateWorkRest(28.5, 'moderate', true).band).toBe('50-75% work');
    expect(allocateWorkRest(28.5, 'moderate', true).workMinutesPerHour).toBe(38);
    expect(allocateWorkRest(29.9, 'moderate', true).band).toBe('25-50% work');
    expect(allocateWorkRest(29.9, 'moderate', true).workMinutesPerHour).toBe(23);
    expect(allocateWorkRest(30.5, 'moderate', true).band).toBe('0-25% work');
    expect(allocateWorkRest(30.5, 'moderate', true).workMinutesPerHour).toBe(8);
    expect(allocateWorkRest(31.0, 'moderate', true).workMinutesPerHour).toBe(8);
  });

  it('stops work once every published band is exceeded', () => {
    const stop = allocateWorkRest(34, 'moderate', true);
    expect(stop.mustStopWork).toBe(true);
    expect(stop.workMinutesPerHour).toBe(0);
    expect(stop.restMinutesPerHour).toBe(60);
    expect(stop.status).toBe('stop');
    expect(stop.limitC).toBe(ABSOLUTE_STOP_WBGT_C);
    expect(allocateWorkRest(31, 'moderate', false).mustStopWork).toBe(true);
  });

  it('gives an unacclimatised crew a stricter plan at the same WBGT', () => {
    const acclimatised = allocateWorkRest(26, 'moderate', true);
    const unacclimatised = allocateWorkRest(26, 'moderate', false);
    expect(unacclimatised.workMinutesPerHour).toBeLessThan(acclimatised.workMinutesPerHour);
    expect(unacclimatised.band).toBe('50-75% work');
    expect(unacclimatised.workMinutesPerHour).toBe(38);
  });

  it('skips categories with no published limit instead of failing', () => {
    const heavy = allocateWorkRest(26, 'heavy', true);
    expect(heavy.band).toBe('50-75% work');
    expect(heavy.workMinutesPerHour).toBe(38);
  });

  it('always splits the hour into 60 minutes', () => {
    for (const category of WORK_CATEGORIES) {
      for (const wbgt of [20, 25, 27.5, 28, 29.5, 30, 31, 32, 33, 35]) {
        for (const acclimatised of [true, false]) {
          const allocation = allocateWorkRest(wbgt, category.id, acclimatised);
          expect(allocation.workMinutesPerHour + allocation.restMinutesPerHour).toBe(60);
        }
      }
    }
  });
});

describe('waterMlPerHour', () => {
  it('scales with heat load and metabolic rate, and stays inside sane bounds', () => {
    expect(waterMlPerHour(30, 'moderate')).toBeGreaterThan(waterMlPerHour(25, 'moderate'));
    expect(waterMlPerHour(30, 'veryHeavy')).toBeGreaterThan(waterMlPerHour(30, 'light'));
    for (const wbgt of [20, 26, 31, 36, 45]) {
      for (const category of WORK_CATEGORIES) {
        const value = waterMlPerHour(wbgt, category.id);
        expect(value).toBeGreaterThanOrEqual(250);
        expect(value).toBeLessThanOrEqual(1200);
      }
    }
  });
});
