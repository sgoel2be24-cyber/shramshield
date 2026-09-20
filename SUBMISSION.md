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
sheet. Verified: 76/76 engine tests, and the wet-bulb term agrees with Open-Meteo's independent
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
2. Switch **Dataset → Delhi heatwave (May 2025)** and **Work rate → Very heavy work**: the banner
   names the hours inside the recommended shift that must stop (11:00, 12:00), and the timeline
   below shows four stop-work hours across the whole day — a real 2025 heatwave day, not a
   synthetic one.
3. Scroll to **"Same thermometer, different danger"** — the two-city comparison — and to
   **"Would today be different?"**, which re-plans the same day three ways.
4. Scroll to **"How this is computed, and what we have not proven"** — standards, assumptions and the
   measured evidence, including what is *not* validated.
5. Press **Copy plan** (top-right of the plan panel) to see the hand-off artifact a supervisor would
   send to a crew.

## Feasibility and scalability (measured, not asserted)

- **Cold load: 95 KB gzipped in 3 requests.** No server, no database, no third-party scripts, no
  analytics, no secret in the client — the weather API needs no key.
- **A default visit makes zero API calls.** Seven Indian cities and two archived heatwave days ship
  in the bundle, so the tool works with no network; a live forecast is one opt-in call per plan.
- **Free tier headroom:** Open-Meteo publishes 10,000 calls/day and 300,000/month on the free tier —
  roughly ten thousand live plans a day — and the app already degrades to bundled data, with a
  visible reason, if a fetch fails.
- **Running it for real:** the free tier is non-commercial. A labour department or contractor moves
  to the Standard plan (1M calls/month) by changing the base URL to `customer-api.open-meteo.com`
  and adding a key — identical API syntax, so it is a one-line change, not a rewrite. Static hosting
  plus one weather subscription is the entire operating cost; there is no per-user server cost.
- **Any country:** ISO 7243 and the ACGIH tables are not India-specific. Adding a location is a
  latitude and a longitude.

## Honest limits (stated in the README and in the app)

Globe temperature and natural wet-bulb temperature are modelled, not measured; clothing adjustment
(PPE) is not applied; night-shift planning is out of scope; the tool is advisory and does not replace
a site heat policy or medical advice.
