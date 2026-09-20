import { describe, expect, it } from 'vitest';
import { firstDayHours, scenarioBySlug } from './fallback';
import { optimiseShiftWindow, planShift } from './plan';
import { planToText } from './planText';

const day = firstDayHours(scenarioBySlug('hot-delhi').hours);
const plan = planShift(day, 'moderate', true);
const window = optimiseShiftWindow(day, 'moderate', true, 8);

const text = planToText(plan, window, {
  locationName: 'Delhi heatwave (May 2025)',
  dataLabel: '20 May 2025',
  categoryLabel: 'Moderate work',
  acclimatised: true,
});

describe('planToText', () => {
  it('carries the same numbers the screen shows', () => {
    expect(text).toContain('RECOMMENDED SHIFT: 05:00 – 13:00');
    expect(text).toContain('Default 09:00 rota would spend 480 min above the safe limit');
    expect(text).toContain('this window spends 240 min');
    expect(text).toContain('Peak WBGT 30.9 C vs 28.0 C limit');
  });

  it('names every hour and marks the ones that must stop', () => {
    // One row per hour, matched on the row shape (indented, starts with an HH:00 label) so the
    // summary line above cannot inflate the count.
    const hourRows = text.split('\n').filter((line) => /^\s{2}\d{2}:00\s/.test(line));
    expect(hourRows).toHaveLength(24);
    expect(text).toContain('No hours require a full stop of work.');
  });

  it('states the water and the method so the sheet stands alone', () => {
    expect(text).toMatch(/Water for the shift: \d+(\.\d)? L per worker\./);
    expect(text).toContain('ISO 7243');
    expect(text).toContain('ACGIH');
    expect(text).toContain('Advisory only');
  });

  it('flags stop-work hours when a heavier work rate forces them', () => {
    const veryHeavy = planToText(
      planShift(day, 'veryHeavy', true),
      optimiseShiftWindow(day, 'veryHeavy', true, 8),
      {
        locationName: 'Delhi heatwave (May 2025)',
        dataLabel: '20 May 2025',
        categoryLabel: 'Very heavy work',
        acclimatised: true,
      },
    );
    expect(veryHeavy).toContain('STOP WORK in these hours:');
    expect(veryHeavy).toContain('11:00');
    expect(veryHeavy).toContain('<- STOP WORK');
  });

  it('degrades honestly when no shift window fits', () => {
    const impossible = planToText(plan, { best: null, naive: null, candidates: [], shiftLengthHours: 8 }, {
      locationName: 'nowhere',
      dataLabel: 'no data',
      categoryLabel: 'Light work',
      acclimatised: false,
    });
    expect(impossible).toContain('could not be computed from this data');
    expect(impossible).not.toContain('Water for the shift');
  });
});
