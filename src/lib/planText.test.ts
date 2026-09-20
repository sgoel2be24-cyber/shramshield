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
  category: 'moderate' as const,
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
        category: 'veryHeavy',
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
      category: 'light',
      categoryLabel: 'Light work',
      acclimatised: false,
    });
    expect(impossible).toContain('could not be computed from this data');
    expect(impossible).not.toContain('Water for the shift');
  });
});

describe('planToText in Hindi', () => {
  const meta = {
    locationName: 'Delhi heatwave (May 2025)',
    dataLabel: '20 May 2025',
    category: 'veryHeavy' as const,
    categoryLabel: 'Very heavy work',
    acclimatised: true,
  };
  const veryHeavyPlan = planShift(day, 'veryHeavy', true);
  const veryHeavyWindow = optimiseShiftWindow(day, 'veryHeavy', true, 8);
  const hi = planToText(veryHeavyPlan, veryHeavyWindow, meta, 'hi');
  const en = planToText(veryHeavyPlan, veryHeavyWindow, meta, 'en');

  it('carries the stop-work instruction, which is the whole point of translating this', () => {
    expect(hi).toContain('इन घंटों में काम पूरी तरह बंद रखें: 11:00');
    expect(hi).toContain('<- काम बंद');
  });

  it('states the same numbers as the English sheet', () => {
    const numbers = (text: string) => text.match(/\d+(\.\d+)?/g) ?? [];
    expect(numbers(hi)).toEqual(numbers(en));
  });

  it('names one row per hour, exactly as the English sheet does', () => {
    const rows = (text: string) => text.split('\n').filter((line) => /^\s{2}\d{2}:00\s/.test(line));
    expect(rows(hi)).toHaveLength(rows(en).length);
    expect(rows(hi)).toHaveLength(24);
  });

  it('is not half-translated — no English instruction leaks into the Hindi sheet', () => {
    // A sheet that says "STOP WORK" in English to a crew that cannot read it is the failure
    // this whole feature exists to prevent, and a partial translation hides it.
    for (const leak of ['STOP WORK', 'min work', 'min rest', 'Water for the shift', 'Advisory only']) {
      expect(hi).not.toContain(leak);
    }
    // The standards keep their published names in both languages, on purpose.
    expect(hi).toContain('WBGT');
    expect(hi).toContain('ISO 7243');
    expect(hi).toContain('ACGIH');
  });

  it('names the work rate in Hindi rather than passing the English label through', () => {
    expect(hi).toContain('बहुत भारी काम');
    expect(hi).not.toContain('Very heavy work');
  });

  it('inflects the hour correctly — घंटा singular, घंटे plural', () => {
    const line = (minutes: number) =>
      planToText(
        veryHeavyPlan,
        {
          ...veryHeavyWindow,
          best: { ...veryHeavyWindow.best!, permittedWorkMinutes: minutes },
        },
        meta,
        'hi',
      )
        .split('\n')
        .find((row) => row.startsWith('इस शिफ्ट में काम की अनुमति:'));

    expect(line(108)).toContain('1 घंटा 48 मिनट');
    expect(line(168)).toContain('2 घंटे 48 मिनट');
    expect(line(30)).toContain('0 घंटे 30 मिनट');
  });

  it('degrades honestly in Hindi too', () => {
    const impossible = planToText(
      veryHeavyPlan,
      { best: null, naive: null, candidates: [], shiftLengthHours: 8 },
      meta,
      'hi',
    );
    expect(impossible).toContain('सुझाई गई शिफ्ट: इस डेटा से तय नहीं हो सकी।');
    expect(impossible).not.toContain('शिफ्ट के लिए पानी');
  });
});
