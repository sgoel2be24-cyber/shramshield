#!/usr/bin/env python3
"""Fetch real Open-Meteo forecast data for the ShramShield demo cities.

Writes one JSON file per city into src/lib/fallback/ in the shape the engine consumes
(ForecastHour), plus Open-Meteo's own wet_bulb_temperature_2m so tests can validate our
Stull (2011) implementation against an independent third-party implementation.

Keyless, no API key, no account — this is also what makes the offline demo path honest:
the bundled data is real forecast data, not invented numbers.
"""
from __future__ import annotations

import json
import pathlib
import urllib.parse
import urllib.request

CITIES = {
    "delhi": ("Delhi", 28.6139, 77.2090),
    "chennai": ("Chennai", 13.0827, 80.2707),
    "jaipur": ("Jaipur", 26.9124, 75.7873),
    "ahmedabad": ("Ahmedabad", 23.0225, 72.5714),
    "jaisalmer": ("Jaisalmer", 26.9157, 70.9083),
    "bhubaneswar": ("Bhubaneswar", 20.2961, 85.8245),
    "mumbai": ("Mumbai", 19.0760, 72.8777),
}

HOURLY = [
    "temperature_2m",
    "relative_humidity_2m",
    "wind_speed_10m",
    "shortwave_radiation",
    "wet_bulb_temperature_2m",
]

OUT_DIR = pathlib.Path(__file__).resolve().parents[1] / "src" / "lib" / "fallback"


def fetch(lat: float, lon: float) -> dict:
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": ",".join(HOURLY),
        "timezone": "Asia/Kolkata",
        "forecast_days": 3,
        "wind_speed_unit": "ms",
    }
    url = "https://api.open-meteo.com/v1/forecast?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=45) as response:
        return json.loads(response.read().decode("utf-8"))


def to_hours(payload: dict) -> list[dict]:
    hourly = payload["hourly"]
    times = hourly["time"]
    hours = []
    for i, iso in enumerate(times):
        hh = iso[11:13]
        hours.append(
            {
                "timeIso": iso,
                "hourLabel": f"{hh}:00",
                "dryBulbC": hourly["temperature_2m"][i],
                "relativeHumidity": hourly["relative_humidity_2m"][i],
                "windMs": hourly["wind_speed_10m"][i],
                "solarWm2": hourly["shortwave_radiation"][i],
                "meteoWetBulbC": hourly["wet_bulb_temperature_2m"][i],
            }
        )
    return hours


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    index = []
    for slug, (name, lat, lon) in CITIES.items():
        payload = fetch(lat, lon)
        hours = to_hours(payload)
        doc = {
            "slug": slug,
            "name": name,
            "latitude": lat,
            "longitude": lon,
            "source": "Open-Meteo forecast API (/v1/forecast), timezone Asia/Kolkata, fetched 2026-09-20",
            "hours": hours,
        }
        (OUT_DIR / f"{slug}.json").write_text(json.dumps(doc, indent=1) + "\n", encoding="utf-8")
        peaks = max(hours, key=lambda h: h["dryBulbC"])
        index.append(
            {
                "slug": slug,
                "name": name,
                "hours": len(hours),
                "peakTempC": peaks["dryBulbC"],
                "peakAt": peaks["hourLabel"],
            }
        )
        print(f"{name}: {len(hours)} hours, peak {peaks['dryBulbC']}C at {peaks['hourLabel']}")
    (OUT_DIR / "index.json").write_text(json.dumps(index, indent=1) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
