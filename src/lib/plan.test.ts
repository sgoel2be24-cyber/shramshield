import { describe, expect, it } from 'vitest';
import { firstDayHours, scenarioBySlug } from './fallback';
import { continuousLimit, optimiseShiftWindow, planShift, windowVerdictLine } from './plan';

const delhi = scenarioBySlug('delhi');
const delhiDay = firstDayHours(delhi.hours);
const hotDelhi = scenarioBySlug('hot-delhi');
const hotDelhiDay = firstDayHours(hotDelhi.hours);
const hotJaisalmer = scenarioBySlug('hot-jaisalmer');
const hotJaisalmerDay = firstDayHours(hotJaisalmer.hours);

describe('planShift — arithmetic and invariants', () => {
  it('splits every hour into 60 minutes of work or rest', () => {
    const plan = planShift(delhiDay, 'moderate', true);
    for (const planned of plan.hours) {
      expect(planned.workMinutes + planned.restMinutes).toBe(60);
    }
  });

  it('reports the continuous-work limit it planned against', () => {
    expect(planShift(delhiDay, 'moderate', true).continuousLimitC).toBe(28.0);
    expect(planShift(delhiDay, 'heavy', true).continuousLimitC).toBe(27.5);
    expect(planShift(delhiDay, 'moderate', false).continuousLimitC).toBe(25.0);
    expect(planShift(delhiDay, 'heavy', true).continuousLimitC).toBe(
      continuousLimit('heavy', true),
    );
  });

  it('carries forecast provenance through to the planned hour', () => {
    const plan = planShift(delhiDay, 'moderate', true);
    expect(plan.hours).toHaveLength(delhiDay.length);
    expect(plan.hours[0]?.timeIso).toBe(delhiDay[0]?.timeIso);
    expect(plan.hours.every((planned) => planned.estimated)).toBe(true);
  });

  it('handles an empty horizon without throwing', () => {
    const plan = planShift([], 'moderate', true);
    expect(plan.hours).toHaveLength(0);
    expect(plan.permittedWorkMinutes).toBe(0);
    expect(plan.peakWbgtC).toBe(0);
  });
});

describe('planShift — real bundled forecast data', () => {
  it('breaches the moderate continuous-work limit on a real September day in Delhi', () => {
    const plan = planShift(delhiDay, 'moderate', true);
    expect(plan.peakWbgtC).toBeGreaterThan(plan.continuousLimitC);
    expect(plan.exceedanceDegreeMinutes).toBeGreaterThan(0);
    expect(plan.hours.some((planned) => planned.aboveContinuousLimit)).toBe(true);
  });

  it('gives a heavier crew fewer permitted work minutes on the same day', () => {
    const moderate = planShift(delhiDay, 'moderate', true);
    const heavy = planShift(delhiDay, 'heavy', true);
    const veryHeavy = planShift(delhiDay, 'veryHeavy', true);
    expect(heavy.permittedWorkMinutes).toBeLessThan(moderate.permittedWorkMinutes);
    expect(veryHeavy.permittedWorkMinutes).toBeLessThan(heavy.permittedWorkMinutes);
  });

  it('gives an unacclimatised crew a stricter plan than an acclimatised one', () => {
    const acclimatised = planShift(delhiDay, 'moderate', true);
    const unacclimatised = planShift(delhiDay, 'moderate', false);
    expect(unacclimatised.permittedWorkMinutes).toBeLessThanOrEqual(
      acclimatised.permittedWorkMinutes,
    );
    expect(unacclimatised.exceedanceDegreeMinutes).toBeGreaterThan(
      acclimatised.exceedanceDegreeMinutes,
    );
  });

  it('reports water demand that rises with the severity of the plan', () => {
    const moderate = planShift(delhiDay, 'moderate', true);
    const veryHeavy = planShift(delhiDay, 'veryHeavy', true);
    expect(veryHeavy.totalWaterLitres).toBeGreaterThan(moderate.totalWaterLitres);
    expect(moderate.totalWaterLitres).toBeGreaterThan(0);
  });
});

describe('planShift — real heatwave archive data (May 2025)', () => {
  it('reaches a genuine stop-work state for very heavy work', () => {
    const plan = planShift(hotDelhiDay, 'veryHeavy', true);
    expect(plan.hours.some((planned) => planned.allocation.mustStopWork)).toBe(true);
    expect(plan.stopMinutes).toBeGreaterThan(0);
  });

  it('pins the measured peak WBGT of the archived Delhi day', () => {
    const plan = planShift(hotDelhiDay, 'moderate', true);
    expect(plan.peakWbgtC).toBeCloseTo(30.9, 1);
    // The hottest hour permits only the 0-25% band.
    const hottest = plan.hours.reduce((max, planned) => (planned.wbgtC > max.wbgtC ? planned : max));
    expect(hottest.workMinutes).toBe(8);
  });

  it('shows the same thermometer reading producing different strain — the core claim', () => {
    const delhiPeak = Math.max(...hotDelhiDay.map((h) => h.dryBulbC));
    const jaisalmerPeak = Math.max(...hotJaisalmerDay.map((h) => h.dryBulbC));
    // Dry-bulb peaks are within half a degree of each other...
    expect(Math.abs(delhiPeak - jaisalmerPeak)).toBeLessThanOrEqual(0.5);
    // ...but the planned strain is materially different, because one day is far more humid.
    const delhiPlan = planShift(hotDelhiDay, 'moderate', true);
    const jaisalmerPlan = planShift(hotJaisalmerDay, 'moderate', true);
    expect(delhiPlan.peakWbgtC - jaisalmerPlan.peakWbgtC).toBeGreaterThan(1.5);
    expect(delhiPlan.permittedWorkMinutes).toBeLessThan(jaisalmerPlan.permittedWorkMinutes);
  });
});

describe('optimiseShiftWindow', () => {
  it('finds a window with less heat exposure than a naive 09:00 start', () => {
    const result = optimiseShiftWindow(hotDelhiDay, 'moderate', true, 8);
    expect(result.best).not.toBeNull();
    expect(result.naive).not.toBeNull();
    expect(result.best?.exceedanceDegreeMinutes ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
      result.naive?.exceedanceDegreeMinutes ?? Number.NEGATIVE_INFINITY,
    );
  });

  it('moves the shift earlier on a hot day', () => {
    const result = optimiseShiftWindow(hotDelhiDay, 'moderate', true, 8);
    const startHour = Number.parseInt(result.best?.startLabel.slice(0, 2) ?? '99', 10);
    expect(startHour).toBeLessThan(9);
    expect(startHour).toBeGreaterThanOrEqual(5);
  });

  it('only offers candidate starts inside plausible shift hours', () => {
    const result = optimiseShiftWindow(delhiDay, 'moderate', true, 8);
    expect(result.candidates.length).toBeGreaterThan(0);
    for (const candidate of result.candidates) {
      const startHour = Number.parseInt(candidate.startLabel.slice(0, 2), 10);
      expect(startHour).toBeGreaterThanOrEqual(5);
      expect(startHour).toBeLessThanOrEqual(14);
    }
  });

  it('never recommends a window with more permitted work than it can deliver', () => {
    const result = optimiseShiftWindow(delhiDay, 'moderate', true, 8);
    expect(result.best?.exceedanceDegreeMinutes ?? -1).toBeGreaterThanOrEqual(0);
    expect(result.best?.permittedWorkMinutes ?? 0).toBeLessThanOrEqual(8 * 60);
  });

  it('returns null instead of guessing when no window fits', () => {
    expect(optimiseShiftWindow(delhiDay.slice(0, 4), 'moderate', true, 8).best).toBeNull();
    expect(optimiseShiftWindow([], 'moderate', true, 8).best).toBeNull();
  });

  it('is deterministic — the same inputs select the same window', () => {
    const first = optimiseShiftWindow(hotDelhiDay, 'heavy', true, 9);
    const second = optimiseShiftWindow(hotDelhiDay, 'heavy', true, 9);
    expect(first.best).toEqual(second.best);
  });
});

describe('plan arithmetic on the bundled forecast', () => {
  it('aggregates the per-hour plan exactly, with no hidden rounding', () => {
    const plan = planShift(delhiDay, 'moderate', true);
    const summedWork = plan.hours.reduce((sum, planned) => sum + planned.workMinutes, 0);
    const stopHours = plan.hours.filter((planned) => planned.allocation.mustStopWork);
    expect(plan.permittedWorkMinutes).toBe(summedWork);
    expect(plan.stopMinutes).toBe(stopHours.length * 60);
    expect(plan.peakWbgtC).toBe(Math.max(...plan.hours.map((planned) => planned.wbgtC)));
    expect(plan.totalWaterLitres).toBe(
      Math.round(
        (plan.hours.reduce((sum, planned) => sum + planned.waterMl, 0) / 1000) * 10,
      ) / 10,
    );
  });

  it('exposes an exceedance sign that matches the limit it planned against', () => {
    for (const planned of planShift(hotDelhiDay, 'moderate', true).hours) {
      const expected = planned.wbgtC - 28.0;
      expect(planned.exceedanceC).toBeCloseTo(Math.round(expected * 10) / 10, 1);
      expect(planned.aboveContinuousLimit).toBe(planned.wbgtC > 28.0);
    }
  });
});

describe('windowVerdictLine', () => {
  it('quotes the minutes saved when the recommended window beats the 09:00 rota', () => {
    const result = optimiseShiftWindow(hotDelhiDay, 'veryHeavy', true, 8);
    const line = windowVerdictLine(result.best, result.naive);
    expect(line).toContain('Starting at 05:00');
    expect(line).toMatch(/keeps \d+ minutes/);
  });

  it('never claims the 09:00 rota won while a different window is recommended', () => {
    // Unacclimatised very heavy work on the archived Delhi heatwave: the recommended window
    // saves no exposure minutes, but it is not the 09:00 rota either.
    const result = optimiseShiftWindow(hotDelhiDay, 'veryHeavy', false, 8);
    const best = result.best;
    const naive = result.naive;
    expect(best).not.toBeNull();
    expect(naive).not.toBeNull();
    expect(best!.startIndex).not.toBe(naive!.startIndex);
    expect(naive!.exposureMinutes - best!.exposureMinutes).toBeLessThanOrEqual(0);

    const line = windowVerdictLine(best, naive);
    expect(line).toContain('No start time avoids the heat today');
    expect(line).not.toContain(`${naive!.startLabel} is already the best available window`);
  });

  it('says the rota is already best only when the optimiser picked that same start', () => {
    const result = optimiseShiftWindow(hotDelhiDay, 'veryHeavy', false, 8);
    const naive = result.naive;
    expect(windowVerdictLine(naive, naive)).toBe(
      `${naive!.startLabel} is already the best available window today — the whole day is hot.`,
    );
  });

  it('falls back to an honest message when no window fits', () => {
    expect(windowVerdictLine(null, null)).toBe(
      'Not enough hours in this dataset to fit the requested shift.',
    );
  });
});
