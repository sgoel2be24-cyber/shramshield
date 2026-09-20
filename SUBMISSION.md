# HACKDAY 1.0 — submission copy (ShramShield)

Ready-to-paste answers for the submission form. Every number here is a measurement from the repo
(`npm test`, `node scripts/collect_evidence.mjs`), not an estimate.

## Project title

ShramShield — heat-safety shift plans for outdoor workers

## Short description (form-length)

ShramShield turns a weather forecast into an enforceable heat-safety shift plan for people who work
outdoors. Paste-free and keyless: pick a location and a work rate and it returns the shift window to
use (e.g. start 05:00 instead of 09:00), the minutes to work and rest in every hour, the water the
crew needs, and the hours that must stop entirely.

It uses WBGT (ISO 7243) — the temperature-humidity-solar metric India's heat alerts do not use — and
the ACGIH TLV screening table for work/rest cycles, computed by a hand-written, unit-tested engine in
the browser. Two real archived days (20 May 2025) show why that matters: Delhi peaked at 42.6 °C air
and 30.9 °C WBGT while Jaisalmer peaked at 42.5 °C air but only 28.8 °C WBGT — the same thermometer
reading costs the same crew 270 minutes of permitted work. Dry-bulb alerts cannot see that difference.

Everything runs client-side with no API key and no server: real bundled data for seven Indian cities
plus two heatwave archive days means the demo works offline, and a live forecast is an optional
upgrade. The plan can be copied as text for a crew hand-off (WhatsApp-ready) or printed as a wall
sheet. Verified: 69/69 engine tests, and the wet-bulb term agrees with Open-Meteo's independent
implementation to a 0.051 °C mean / 0.170 °C worst-case deviation across 504 real forecast hours.

## Links

- Live deployment: https://shramshield.vercel.app
- GitHub repository: https://github.com/sgoel2be24-cyber/shramshield
- Presentation deck: `deck/ShramShield-HACKDAY-1.0.pptx` (in the repository)

## Team

Shikhar Goel (solo entry)

## Built during the window

All commits fall inside the 09:00–17:00 IST window on 20 September 2026
(`git log --format="%h %ci %s"`). No prior project was reused; the repo was created in-window.

## Anything we want judges to open first

1. The live link, default view (Delhi, moderate work) — the verdict line at the top.
2. Switch **Dataset → Delhi heatwave (May 2025)** and **Work rate → Very heavy work**: the app reports
   four hours that must stop entirely, a real 2025 heatwave day, not a synthetic one.
3. Scroll to **"Same thermometer, different danger"** — the two-city comparison.
4. Scroll to **"How this is computed, and what we have not proven"** — standards, assumptions and the
   measured evidence, including what is *not* validated.
5. Press **Copy plan** (top-right of the plan panel) to see the hand-off artifact a supervisor would
   send to a crew.

## Honest limits (stated in the README and in the app)

Globe temperature and natural wet-bulb temperature are modelled, not measured; clothing adjustment
(PPE) is not applied; night-shift planning is out of scope; the tool is advisory and does not replace
a site heat policy or medical advice.
