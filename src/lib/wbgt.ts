/**
 * WBGT (wet bulb globe temperature) engine — ShramShield.
 *
 * What we compute, and how honest it is:
 *
 *   WBGT_outdoor = 0.7 * Tnwb + 0.2 * Tg + 0.1 * Tdb      (ISO 7243 / ACGIH form)
 *
 * - Natural wet-bulb temperature (Tnwb) is approximated by the psychrometric wet-bulb
 *   temperature from Stull (2011), "Wet-Bulb Temperature from Relative Humidity and Air
 *   Temperature", J. Appl. Meteor. Climatol. 50, 2267-2269. Tnwb >= Twb in low wind, so this
 *   approximation tends to UNDER-state WBGT slightly in still air (~0.5-1 C). Disclosed in app.
 * - Globe temperature (Tg) is ESTIMATED from shortwave radiation and wind (no black-globe
 *   thermometer available from a forecast). Single empirical model, calibrated so that
 *   SR = 0 yields Tg == Tdb exactly (physically required), and a hot sunny low-wind case
 *   lands near measured globe values. It is an estimate and is labelled as such in the UI.
 * - Dry-bulb (Tdb) comes straight from the forecast.
 *
 * The engine deliberately does NOT hide behind a library: every number here is derived from
 * the inputs, and every constant is stated with its source.
 */

/** Weights of the outdoor (with solar load) WBGT equation, ISO 7243. */
export const WBGT_WEIGHTS = {
  naturalWetBulb: 0.7,
  globe: 0.2,
  dryBulb: 0.1,
} as const;

/** Empirical globe-temperature model constants (see file header). */
export const GLOBE_MODEL = {
  /** Degrees above dry-bulb per 1000 W/m2 of shortwave radiation at zero wind. */
  solarGainPer1000Wm2: 9.0,
  /** Exponential damping of the solar gain per m/s of wind (convective cooling). */
  windDampingPerMs: 0.12,
} as const;

export interface WbgtInput {
  /** Air temperature at 2 m, degrees C. */
  dryBulbC: number;
  /** Relative humidity, percent (0-100). */
  relativeHumidity: number;
  /** Wind speed at 10 m, metres per second. */
  windMs: number;
  /** Shortwave (global horizontal) radiation, W/m2. */
  solarWm2: number;
}

export interface WbgtResult {
  /** Wet bulb globe temperature, degrees C. */
  wbgtC: number;
  /** Psychrometric wet-bulb temperature used as the natural wet-bulb proxy, degrees C. */
  wetBulbC: number;
  /** Estimated globe temperature, degrees C. */
  globeC: number;
  /** Dry-bulb temperature in, for traceability. */
  dryBulbC: number;
  /** True when the globe/natural-wet-bulb terms came from our models rather than sensors. */
  estimated: boolean;
}

/**
 * Psychrometric wet-bulb temperature (Stull 2011). Valid for the range the paper covers:
 * -20 C <= T <= 50 C and 5% <= RH <= 99%, which covers all plausible work conditions.
 */
export function psychrometricWetBulb(dryBulbC: number, relativeHumidity: number): number {
  const rh = clamp(relativeHumidity, 1, 100);
  const t = dryBulbC;
  return (
    t * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
    Math.atan(t + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
    4.686035
  );
}

/**
 * Estimated black-globe temperature from shortwave radiation and wind.
 * Property that must hold (and is tested): with zero solar load, Tg === dryBulbC.
 */
export function estimatedGlobeTemp(dryBulbC: number, solarWm2: number, windMs: number): number {
  const solar = clamp(solarWm2, 0, 1400);
  const wind = Math.max(0, windMs);
  const solarGain =
    GLOBE_MODEL.solarGainPer1000Wm2 * (solar / 1000) * Math.exp(-GLOBE_MODEL.windDampingPerMs * wind);
  return dryBulbC + solarGain;
}

/** Full WBGT computation for one hour of conditions. */
export function computeWbgt(input: WbgtInput): WbgtResult {
  const dryBulbC = input.dryBulbC;
  const wetBulbC = psychrometricWetBulb(dryBulbC, input.relativeHumidity);
  const globeC = estimatedGlobeTemp(dryBulbC, input.solarWm2, input.windMs);
  const wbgtC =
    WBGT_WEIGHTS.naturalWetBulb * wetBulbC +
    WBGT_WEIGHTS.globe * globeC +
    WBGT_WEIGHTS.dryBulb * dryBulbC;
  return {
    wbgtC: round1(wbgtC),
    wetBulbC: round1(wetBulbC),
    globeC: round1(globeC),
    dryBulbC: round1(dryBulbC),
    estimated: true,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
