import { describe, expect, it } from 'vitest';
import { FALLBACK_CITIES, firstDayHours } from './fallback';
import { estimatedGlobeTemp, psychrometricWetBulb } from './wbgt';

/**
 * External validation of our wet-bulb implementation.
 *
 * Open-Meteo's forecast API publishes its own `wet_bulb_temperature_2m`, computed by an
 * independent implementation. Comparing our Stull (2011) closed form against it over real
 * forecast hours is the closest thing to third-party verification available without a
 * calibrated WBGT meter — and it is honest about what it does and does not prove:
 *
 *   it proves our WET-BULB term agrees with an independent implementation,
 *   it does NOT prove the globe-temperature estimate, which has no external check here.
 *
 * The measured deviation is printed so the number quoted in the README comes from a real run.
 */
describe('wet-bulb vs an independent implementation (Open-Meteo)', () => {
  const deviations: number[] = [];
  let hoursChecked = 0;

  for (const city of FALLBACK_CITIES) {
    for (const hour of city.hours) {
      if (typeof hour.meteoWetBulbC !== 'number') continue;
      hoursChecked += 1;
      deviations.push(Math.abs(psychrometricWetBulb(hour.dryBulbC, hour.relativeHumidity) - hour.meteoWetBulbC));
    }
  }

  const maxDeviation = deviations.length ? Math.max(...deviations) : Number.NaN;
  const meanDeviation = deviations.length
    ? deviations.reduce((sum, value) => sum + value, 0) / deviations.length
    : Number.NaN;

  it('covers a meaningful sample of real forecast hours', () => {
    expect(hoursChecked).toBeGreaterThan(300);
  });

  it('agrees with the independent implementation to better than 0.5 C', () => {
    console.log(
      `[validation] wet-bulb vs Open-Meteo over ${hoursChecked} real hours: ` +
        `mean abs deviation ${meanDeviation.toFixed(3)} C, max ${maxDeviation.toFixed(3)} C`,
    );
    expect(maxDeviation).toBeLessThan(0.5);
    expect(meanDeviation).toBeLessThan(0.15);
  });

  it('confirms the globe model collapses to dry-bulb when there is no sun', () => {
    // Night hours in the bundled data have zero shortwave radiation; the model must not
    // invent radiant load, or every night shift would be planned as if it were midday.
    let nightHours = 0;
    for (const city of FALLBACK_CITIES) {
      for (const hour of city.hours) {
        if (hour.solarWm2 !== 0) continue;
        nightHours += 1;
        expect(estimatedGlobeTemp(hour.dryBulbC, hour.solarWm2, hour.windMs)).toBeCloseTo(
          hour.dryBulbC,
          6,
        );
      }
    }
    expect(nightHours).toBeGreaterThan(0);
  });

  it('holds the bundled scenario files to a single inspected day each', () => {
    for (const city of FALLBACK_CITIES) {
      expect(firstDayHours(city.hours)).toHaveLength(24);
    }
  });
});
