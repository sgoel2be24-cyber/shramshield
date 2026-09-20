import { describe, expect, it } from 'vitest';
import { FALLBACK_CITIES, dayLabel, firstDayHours, pickPlanningDay, type FetchedHour } from './fallback';

function hour(day: string, hourLabel: string): FetchedHour {
  return {
    timeIso: `${day}T${hourLabel}:00`,
    hourLabel,
    dryBulbC: 30,
    relativeHumidity: 50,
    windMs: 1,
    solarWm2: 400,
  };
}

describe('pickPlanningDay', () => {
  it('returns the full day for the bundled data', () => {
    for (const city of FALLBACK_CITIES) {
      expect(pickPlanningDay(city.hours)).toHaveLength(24);
      expect(pickPlanningDay(city.hours)).toEqual(firstDayHours(city.hours));
    }
  });

  it('skips a nearly-exhausted first day when a live forecast is fetched in the evening', () => {
    // A forecast pulled at 21:00: the "first day" holds three hours, day two holds all 24.
    const hours: FetchedHour[] = [
      hour('2026-09-20', '21:00'),
      hour('2026-09-20', '22:00'),
      hour('2026-09-20', '23:00'),
      ...Array.from({ length: 24 }, (_, index) =>
        hour('2026-09-21', `${String(index).padStart(2, '0')}:00`),
      ),
    ];
    const chosen = pickPlanningDay(hours);
    expect(chosen).toHaveLength(24);
    expect(chosen[0]?.timeIso.startsWith('2026-09-21')).toBe(true);
    // The naive choice would have produced a three-hour "day" and no shift window at all.
    expect(firstDayHours(hours)).toHaveLength(3);
  });

  it('prefers the day with more staffable hours, not merely more rows', () => {
    const hours: FetchedHour[] = [
      ...Array.from({ length: 24 }, (_, index) =>
        hour('2026-09-21', `${String(index).padStart(2, '0')}:00`),
      ),
      // Day two has 20 rows but only night hours, which no supervisor can staff.
      ...Array.from({ length: 20 }, (_, index) =>
        hour('2026-09-22', `${String((index + 14) % 24).padStart(2, '0')}:00`),
      ),
    ];
    expect(pickPlanningDay(hours)[0]?.timeIso.startsWith('2026-09-21')).toBe(true);
  });

  it('never throws on empty or single-hour input', () => {
    expect(pickPlanningDay([])).toEqual([]);
    expect(pickPlanningDay([hour('2026-09-20', '06:00')])).toHaveLength(1);
  });
});

describe('dayLabel', () => {
  it('labels the day the data belongs to', () => {
    expect(dayLabel([hour('2026-09-20', '06:00')])).toBe('20 Sep 2026');
    expect(dayLabel([hour('2025-05-20', '15:00')])).toBe('20 May 2025');
  });

  it('degrades to the raw date rather than throwing', () => {
    expect(dayLabel([])).toBe('no data');
  });
});
