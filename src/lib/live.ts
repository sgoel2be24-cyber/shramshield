/**
 * Live forecast layer.
 *
 * The app works with zero network calls (bundled real data); this is the enhancement. It is
 * deliberately small, keyless, and honest when it fails: if the fetch does not succeed the UI
 * says so and keeps planning from bundled data rather than showing a spinner or an error page.
 */

import type { FetchedHour } from './fallback';

export interface LiveForecast {
  hours: FetchedHour[];
  fetchedAtIso: string;
  model: string;
}

const HOURLY = [
  'temperature_2m',
  'relative_humidity_2m',
  'wind_speed_10m',
  'shortwave_radiation',
  'wet_bulb_temperature_2m',
].join(',');

export function liveForecastUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: HOURLY,
    timezone: 'Asia/Kolkata',
    forecast_days: '2',
    wind_speed_unit: 'ms',
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

interface OpenMeteoResponse {
  hourly?: {
    time?: string[];
    temperature_2m?: (number | null)[];
    relative_humidity_2m?: (number | null)[];
    wind_speed_10m?: (number | null)[];
    shortwave_radiation?: (number | null)[];
    wet_bulb_temperature_2m?: (number | null)[];
  };
  generationtime_ms?: number;
}

export async function fetchLiveForecast(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<LiveForecast> {
  const response = await fetch(liveForecastUrl(latitude, longitude), signal ? { signal } : {});
  if (!response.ok) {
    throw new Error(`Open-Meteo responded ${response.status}`);
  }
  const payload = (await response.json()) as OpenMeteoResponse;
  const hourly = payload.hourly;
  const times = hourly?.time ?? [];
  const hours: FetchedHour[] = [];

  for (let i = 0; i < times.length; i += 1) {
    const iso = times[i];
    const dryBulbC = hourly?.temperature_2m?.[i];
    const relativeHumidity = hourly?.relative_humidity_2m?.[i];
    const windMs = hourly?.wind_speed_10m?.[i];
    const solarWm2 = hourly?.shortwave_radiation?.[i];
    if (iso === undefined || dryBulbC == null || relativeHumidity == null || windMs == null || solarWm2 == null) {
      continue;
    }
    hours.push({
      timeIso: iso,
      hourLabel: `${iso.slice(11, 13)}:00`,
      dryBulbC,
      relativeHumidity,
      windMs,
      solarWm2,
      meteoWetBulbC: hourly?.wet_bulb_temperature_2m?.[i] ?? undefined,
    });
  }

  if (hours.length === 0) {
    throw new Error('Open-Meteo returned no usable hours');
  }

  return {
    hours,
    fetchedAtIso: new Date().toISOString(),
    model: 'Open-Meteo forecast (best_match)',
  };
}
