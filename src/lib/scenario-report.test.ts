import { describe, expect, it } from 'vitest';
import { firstDayHours, scenarioBySlug } from './fallback';
import { optimiseShiftWindow, planShift } from './plan';

/**
 * Scenario report — prints and asserts the exact numbers quoted in README.md, so a README
 * claim cannot silently rot when the engine changes.
 */
describe('scenario report (numbers quoted in README.md)', () => {
  it('pins the archived Delhi heatwave day (20 May 2025)', () => {
    const day = firstDayHours(scenarioBySlug('hot-delhi').hours);
    const moderate = planShift(day, 'moderate', true);
    const veryHeavy = planShift(day, 'veryHeavy', true);
    const window = optimiseShiftWindow(day, 'moderate', true, 8);

    expect(Math.max(...day.map((h) => h.dryBulbC))).toBeCloseTo(42.6, 1);
    expect(moderate.peakWbgtC).toBe(30.9);
    expect(moderate.permittedWorkMinutes).toBe(897);
    expect(veryHeavy.permittedWorkMinutes).toBe(310);
    expect(veryHeavy.stopMinutes).toBe(240);
    expect(window.best?.startLabel).toBe('05:00');
    expect(window.best?.exposureMinutes).toBe(240);
    expect(window.naive?.exposureMinutes).toBe(480);

    console.log(
      `[scenario] hot-delhi: peak air 42.6C, peak WBGT 30.9C, moderate work permitted 897 min, ` +
        `very heavy 310 min with 240 min stopped, best window 05:00-13:00 (240 min above limit vs 480 min at 09:00)`,
    );
  });

  it('pins the archived Jaisalmer heatwave day (20 May 2025)', () => {
    const day = firstDayHours(scenarioBySlug('hot-jaisalmer').hours);
    const moderate = planShift(day, 'moderate', true);
    const veryHeavy = planShift(day, 'veryHeavy', true);

    expect(Math.max(...day.map((h) => h.dryBulbC))).toBeCloseTo(42.5, 1);
    expect(moderate.peakWbgtC).toBe(28.8);
    expect(moderate.permittedWorkMinutes).toBe(1167);
    expect(veryHeavy.permittedWorkMinutes).toBe(447);
    expect(veryHeavy.stopMinutes).toBe(0);

    console.log(
      `[scenario] hot-jaisalmer: peak air 42.5C, peak WBGT 28.8C, moderate work permitted 1167 min, ` +
        `very heavy 447 min with no stop hours`,
    );
  });

  it('pins the headline claim: same thermometer, 270 minutes of work apart', () => {
    const delhi = planShift(firstDayHours(scenarioBySlug('hot-delhi').hours), 'moderate', true);
    const jaisalmer = planShift(firstDayHours(scenarioBySlug('hot-jaisalmer').hours), 'moderate', true);
    expect(jaisalmer.permittedWorkMinutes - delhi.permittedWorkMinutes).toBe(270);
    expect(Math.round((delhi.peakWbgtC - jaisalmer.peakWbgtC) * 10) / 10).toBe(2.1);
  });

  it('pins the bundled Delhi forecast plan (20 Sep 2026)', () => {
    const day = firstDayHours(scenarioBySlug('delhi').hours);
    const plan = planShift(day, 'moderate', true);
    const window = optimiseShiftWindow(day, 'moderate', true, 8);

    expect(plan.peakWbgtC).toBe(28.7);
    expect(plan.continuousLimitC).toBe(28.0);
    expect(window.best?.exposureMinutes).toBe(60);
    expect(window.naive?.exposureMinutes).toBe(240);

    console.log(
      `[scenario] delhi forecast: peak air 33.6C, peak WBGT 28.7C vs limit 28.0C, ` +
        `best window 05:00-13:00 (60 min above limit vs 240 min at 09:00)`,
    );
  });
});
