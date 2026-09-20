#!/usr/bin/env python3
"""Fetch a REAL historical heatwave window for the extreme-heat demo scenario.

Same honesty rule as the forecast fallback: the numbers are real observations from
Open-Meteo's historical archive, not invented to make the demo look dramatic. This is what
gives the app a genuine STOP WORK case, which a September forecast in India will not.

Source: Open-Meteo Historical Weather API (/v1/archive), ERA5, timezone Asia/Kolkata.
"""
from __future__ import annotations

import json
import pathlib
import urllib.parse
import urllib.request

SCENARIOS = {
    "hot-jaisalmer": ("Jaisalmer heatwave (May 2025)", 26.9157, 70.9083),
    "hot-delhi": ("Delhi heatwave (May 2025)", 28.6139, 77.2090),
}

START_DATE = "2025-05-20"
END_DATE = "2025-05-27"

HOURLY = [
    "temperature_2m",
    "relative_humidity_2m",
    "wind_speed_10m",
    "shortwave_radiation",
]

OUT_DIR = pathlib.Path(__file__).resolve().parents[1] / "src" / "lib" / "fallback"


def fetch(lat: float, lon: float) -> dict:
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": START_DATE,
        "end_date": END_DATE,
        "hourly": ",".join(HOURLY),
        "timezone": "Asia/Kolkata",
        "wind_speed_unit": "ms",
    }
    url = "https://archive-api.open-meteo.com/v1/archive?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=90) as response:
        return json.loads(response.read().decode("utf-8"))


def to_hours(payload: dict) -> list[dict]:
    hourly = payload["hourly"]
    hours = []
    for i, iso in enumerate(hourly["time"]):
        hours.append(
            {
                "timeIso": iso,
                "hourLabel": iso[11:13] + ":00",
                "dryBulbC": hourly["temperature_2m"][i],
                "relativeHumidity": hourly["relative_humidity_2m"][i],
                "windMs": hourly["wind_speed_10m"][i],
                "solarWm2": hourly["shortwave_radiation"][i],
            }
        )
    return hours


def main() -> None:
    for slug, (name, lat, lon) in SCENARIOS.items():
        payload = fetch(lat, lon)
        hours = [h for h in to_hours(payload) if all(h[k] is not None for k in ("dryBulbC", "relativeHumidity", "windMs", "solarWm2"))]
        doc = {
            "slug": slug,
            "name": name,
            "latitude": lat,
            "longitude": lon,
            "source": (
                f"Open-Meteo Historical Weather API (/v1/archive, ERA5), {START_DATE} to {END_DATE}, "
                "timezone Asia/Kolkata, fetched 2026-09-20"
            ),
            "hours": hours,
        }
        (OUT_DIR / f"{slug}.json").write_text(json.dumps(doc, indent=1) + "\n", encoding="utf-8")
        day1 = [h for h in hours if h["timeIso"].startswith(START_DATE)]
        peak = max(day1, key=lambda h: h["dryBulbC"]) if day1 else None
        print(f"{name}: {len(hours)} hours, day-1 peak {peak['dryBulbC'] if peak else '?'}C at {peak['hourLabel'] if peak else '?'}")


if __name__ == "__main__":
    main()
