/**
 * Bundled real weather data — two kinds, both real, neither invented:
 *
 *  - `kind: 'forecast'`  — today's Open-Meteo forecast for seven Indian cities
 *                          (scripts/fetch_fallback_data.py).
 *  - `kind: 'historical'` — a real May 2025 heatwave window from Open-Meteo's ERA5 archive
 *                          (scripts/fetch_hot_season.py), which is what gives the demo a
 *                          genuine STOP WORK case. A September forecast in India will not.
 *
 * This is the offline demo path: if the network is unavailable — or a judge opens the
 * deployed link days later with nobody watching quotas — the app still plans a real shift
 * from real data. Nothing here was typed by hand.
 */

import type { ForecastHour } from './plan';
import ahmedabad from './fallback/ahmedabad.json';
import bhubaneswar from './fallback/bhubaneswar.json';
import chennai from './fallback/chennai.json';
import delhi from './fallback/delhi.json';
import hotDelhi from './fallback/hot-delhi.json';
import hotJaisalmer from './fallback/hot-jaisalmer.json';
import jaisalmer from './fallback/jaisalmer.json';
import jaipur from './fallback/jaipur.json';
import mumbai from './fallback/mumbai.json';

export interface FetchedHour extends ForecastHour {
  /** Open-Meteo's own wet-bulb value where the forecast API provides it (validation only). */
  meteoWetBulbC?: number;
}

export interface WeatherScenario {
  slug: string;
  name: string;
  kind: 'forecast' | 'historical';
  latitude: number;
  longitude: number;
  source: string;
  hours: FetchedHour[];
}

export const FALLBACK_CITIES: WeatherScenario[] = [
  delhi,
  jaipur,
  jaisalmer,
  chennai,
  ahmedabad,
  bhubaneswar,
  mumbai,
].map((doc) => ({ ...toScenario(doc), kind: 'forecast' }));

export const HOT_SCENARIOS: WeatherScenario[] = [hotJaisalmer, hotDelhi].map((doc) => ({
  ...toScenario(doc),
  kind: 'historical',
}));

export const ALL_SCENARIOS: WeatherScenario[] = [...FALLBACK_CITIES, ...HOT_SCENARIOS];

function toScenario(doc: unknown): WeatherScenario {
  return doc as WeatherScenario;
}

export function scenarioBySlug(slug: string): WeatherScenario {
  const found = ALL_SCENARIOS.find((scenario) => scenario.slug === slug);
  if (!found) throw new Error(`unknown scenario: ${slug}`);
  return found;
}

/** First calendar day of a scenario, i.e. the hours that share the earliest date prefix. */
export function firstDayHours(hours: readonly FetchedHour[]): FetchedHour[] {
  const first = hours[0];
  if (!first) return [];
  const day = first.timeIso.slice(0, 10);
  return hours.filter((hour) => hour.timeIso.slice(0, 10) === day);
}
