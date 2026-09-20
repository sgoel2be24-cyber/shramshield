# ShramShield — heat-safety shift plans for outdoor workers

**Live:** https://shramshield.vercel.app · **Repo:** https://github.com/sgoel2be24-cyber/shramshield
**Built for:** HACKDAY 1.0 (DECODEP community), 20 September 2026 — open innovation, theme *Tech for a Better Tomorrow*, 8-hour build window.

ShramShield turns a weather forecast into an **enforceable heat-safety shift plan** for people who
work outdoors: when to start the shift, how many minutes to work and rest each hour, how much water
the crew needs, and which hours must stop entirely. Every number comes from published standards
(ISO 7243 WBGT, ACGIH TLV screening criteria) computed by a hand-written engine in the browser —
no black box, no API key, nothing sent anywhere.

---

## The problem

India's official heat alerts are built on **air temperature alone**, and the metric that actually
predicts heat strain — WBGT — combines temperature with humidity and solar load. In 2025 that gap
was documented in deaths, not theory:

- **At least 84 heatstroke deaths** were recorded across India between February and July 2025 in a
  news-based analysis, with the NCDC separately reporting **7,192 suspected heatstroke cases but
  only 14 confirmed deaths** (Mar 1–Jun 24, obtained under RTI) — the toll is undercounted.
  Most victims were **elderly people, outdoor workers and daily-wage labourers**.
  — [HeatWatch, *Struck by Heat* (2025)](https://www.heatwatch.in/report/heatwatchs-2025-report-reveals-undercounted-heatstroke-deaths-and-urgent-gaps-in-public-health-response/) · [The Hindu](https://www.thehindu.com/sci-tech/health/india-recorded-at-least-84-heatstroke-deaths-in-2025-summer-study/article69964987.ece)
- The same report documents fatalities on **days when no heat alert was issued**, and calls for
  alerts that "move beyond dry bulb temperature warnings and adopt **WBGT** and Heat Index
  measures", plus **enforceable work-rest cycles**. Outdoor and informal workers are **over 90% of
  India's workforce**, working peak sun without mandatory breaks, shade or cooling access.
- A plea on the same issue is pending before the Supreme Court (notice issued July 2026,
  CJI Gavai bench) — [LiveLaw](https://www.livelaw.in/top-stories/supreme-court-plea-prevent-heatwave-deaths-298578).

A supervisor does not need another thermometer readout. They need to know **what to do with today's
shift**, in the units a labour department understands.

## What it does

Pick a location and a work rate and it produces, for the actual forecast:

| Output | Example (Delhi, moderate work, acclimatised crew) |
|---|---|
| Recommended shift window | **05:00 – 13:00** instead of the default 09:00 rota |
| Minutes above the safe limit (8 h window) | **60 min** starting 05:00 vs **240 min** on the default 09:00 rota — the same metric applied to two candidate windows |
| Peak WBGT vs the limit for that work rate | 28.7 °C vs 28.0 °C — breached |
| Work / rest split per hour | 53 min work / 7 min rest in the cool hours, down to **8 min work / 52 min rest** at noon |
| Water for the crew | litres per worker for that window |
| Stop-work hours (full-day plan) | listed explicitly — `11:00, 12:00, 13:00, 14:00` for very heavy work on a real May 2025 Delhi heatwave day (240 min stopped) |
| Hand-off | **Copy plan** produces the whole plan as text (WhatsApp-ready), and the page prints as a one-page wall sheet |

### The demo beat that matters

Two **real** days from Open-Meteo's ERA5 archive, 20 May 2025:

| | Delhi | Jaisalmer |
|---|---|---|
| Peak air temperature | 42.6 °C | 42.5 °C |
| Peak WBGT | **30.9 °C** | **28.8 °C** |
| Work permitted (moderate, acclimatised, 24 h) | 897 min | 1,167 min |
| Work permitted (very heavy) | 310 min, with **240 min stopped** | 447 min, no stop hours |

Air temperatures within 0.1 °C of each other. Delhi's humidity costs **270 minutes** of permitted
work for the same crew, and pushes very heavy work into a genuine stop-work state. **That
difference is invisible to any alert built on temperature alone.** These numbers are asserted in
`src/lib/scenario-report.test.ts`, so this README cannot drift from the engine.

## Why this is not a calculator

Existing tools — heatsafe.app, agentcalc, commercial WBGT monitoring services — either need a
**WBGT meter or manual site readings**, or are paid hardware platforms. ShramShield:

1. **Computes WBGT from a free, keyless forecast** (no instrument, no account, no key), and
2. **Optimises the shift window** — it searches candidate start times and ranks them by minutes the
   crew would spend above the safe limit, then peak WBGT, then earliest start. This is the decision
   a supervisor actually has to make, and it is the part that is ours.

The ACGIH/Bernard-style work/rest logic is standard; the search over the day is the contribution.

## How the engine works

Hand-written TypeScript, framework-free (`src/lib/`), unit-tested, no heat-stress library:

- **`wbgt.ts`** — `WBGT = 0.7·Tnwb + 0.2·Tg + 0.1·Tdb` (ISO 7243 outdoor weighting).
  Natural wet bulb is approximated by the **psychrometric wet bulb (Stull 2011** closed form);
  globe temperature is **estimated** from shortwave radiation and wind with a model that collapses
  to air temperature at zero sunlight (a tested physical property, not a fudge).
- **`standards.ts`** — the ACGIH TLV screening matrix (2016 TLVs and BEIs, p. 218) reproduced
  **verbatim** for acclimatised and unacclimatised workers, plus metabolic-rate categories
  (115/180/300/415/520 W) and OSHA-based drinking-water guidance. One documented exception: the
  resting-metabolic-rate column comes from secondary ACGIH references (the fact-sheet table has no
  rest column), and the code says so instead of implying the whole matrix came from one page. A
  standards engine that paraphrases its standard is worse than useless, so the tables are recorded
  as published.
- **`plan.ts`** — per-hour work/rest allocation, water, stop-work flags, and the
  `optimiseShiftWindow` search (candidate starts 05:00–14:00; night work is explicitly out of scope).
- **`live.ts` / `fallback.ts`** — live Open-Meteo fetch, with **real bundled data** for seven Indian
  cities and two archived heatwave days, so the demo works with **no network at all**.

## Measured evidence (not adjectives)

| Claim | Measurement | How |
|---|---|---|
| Engine correctness | **76/76 tests pass** | `npm test` — the same count is rendered in the app badge, regenerated by `scripts/collect_evidence.mjs` |
| Wet-bulb implementation is right | mean absolute deviation **0.051 °C**, worst case **0.170 °C** over **504 real forecast hours** in 7 cities | compared against Open-Meteo's own independent `wet_bulb_temperature_2m` |
| Type safety | `tsc -b` clean under `strict` + `noUncheckedIndexedAccess` | `npm run typecheck` |
| Deployed artifact is the built app | marker text + hashed bundle asserted on the served build | `python3 scripts/verify_serve.py` |
| Regression guard for the bug that got past us | `react/set-state-in-render` is an **error**, and CI runs `npm run lint` | that rule exits 1 on the exact commit that white-screened the live site; exits 0 now |

**What is *not* proven:** the globe-temperature term is our model, with no external measurement to
check it against; clothing adjustment (heavy PPE adds several degrees of effective WBGT) is not
applied; night-shift planning is out of scope. These are stated in the app's method panel too.

## Judging rubric mapping

| Criterion | Where it is demonstrated |
|---|---|
| **Problem & impact (25)** | Ceiling figures cited above; the "same thermometer, different danger" comparison; each output is an *action* (start time, minutes to work, litres, stop hours), not a readout. |
| **Innovation (20)** | Forecast→plan without an instrument; the shift-window optimiser; auditable standards-based reasoning instead of an LLM guess. |
| **Technical (25)** | Own WBGT engine + standards tables + optimiser in framework-free modules; 76 tests pinning table values, formula properties, the optimiser's ranking and its verdict copy, the shareable URL, the copyable plan text and the demo narrative; external validation of the wet-bulb term. |
| **UX (15)** | One screen: controls → verdict → hour-by-hour timeline → what-if panel → site-conditions → method/evidence. Cited impact strip on the page itself; colour-coded risk; live region for the verdict; `prefers-reduced-motion`; mobile layout; **one-click copy of the plan as text**, print stylesheet scoped to the crew's plan (the what-if alternatives are hidden in print — on paper they look like the real plan), a **shareable plan URL** (`?city=&cat=&accl=&shift=`) that restores the exact scenario, and an error boundary so a render failure explains itself instead of showing a blank page. |
| **Feasibility (15)** | Static site + one keyless API with a bundled offline fallback; no server, no key, no quota; the same standards apply to any country; ship-able to any labour department or contractor as-is. |

## Build provenance (HACKDAY 1.0 window, 20 Sep 2026)

All commits are inside the 09:00–17:00 window and all are authored by the entrant. The trail
below is generated from `git log` by `node scripts/sync_provenance.mjs`, run before each push:

```
732462a 11:16  scaffold: fresh vite+react+ts repo for HACKDAY 1.0 (ShramShield)
7954773 11:23  engine: WBGT (Stull 1966-form wet bulb + estimated globe), ACGIH/ISO work-rest tabl...
fc3f1a1 11:48  ui: shift plan, hour timeline, site-conditions panel, method+evidence panel; live O...
b632a43 11:52  docs+deck: README mapped to the rubric with measured evidence, submission copy, 6-s...
6bf2ab6 11:52  deck: fix slide-4 text overflow found by the fit check
ecefe12 11:54  ui: mobile table overflow found on a 390px viewport, wrapping table in a scroll con...
c7c236a 11:55  fix(verify): vite preview binds IPv6-only, force IPv4 for the serve smoke test
3be2982 13:31  fix: plan the day a live forecast actually covers; deterministic date labels; add c...
8849cff 13:32  docs+deck: sync test counts and hand-off artifact after the second review pass
2fdd3d9 13:34  docs: state the resting-metabolic-rate column's separate source instead of implying...
772b1f6 13:34  chore: drop unreferenced scaffold assets
0f44824 13:48  audit: Kimi K3 adversarial audit — 2 doc majors, 0 engine blockers; repro for each...
09b84eb 13:52  docs: close the audit findings — full in-window provenance trail, metric basis stat...
6a2d9d1 14:17  feat: cited impact strip on the page — 84 deaths, 7192/14 undercount, 90% informal...
d1e9e6d 14:19  feat: 'would today be different' panel — three one-click re-plans on the same datas...
88513a1 14:21  feat: shareable plan URL (?city/cat/accl/shift) — restores the exact scenario a jud...
25237d3 14:22  feat: live plan-computation time badge — technical depth visible, not just verifiable
fef06e6 14:22  deck: sync to the audited artifact — 69/69 tests, copy-plan hand-off row, metric ba...
7850702 14:23  docs: final sync — 69/69 in README + SUBMISSION + regenerated evidence, URL + impac...
19e97e7 14:49  fix: live forecast white-screened the app (React #301) — memoise the planning day,...
0085d2d 14:49  fix: verdict line no longer credits the 09:00 rota while recommending a different w...
2be228b 14:52  docs: sync to 73/73, regenerate the full in-window provenance trail, correct the wa...
2922473 14:58  fix: a render failure or a printed wall sheet no longer misleads — error boundary w...
b0ae118 14:58  ci: promote react/set-state-in-render to an error and run lint in CI — the one rule...
0d47c83 14:58  docs: record the post-audit review pass — 1 blocker + 4 findings with repros, resol...
1259c12 14:58  chore: generate the provenance trail from git log instead of hand-maintaining it —...
b190a80 15:01  fix: the compute badge said 'plan computed in 0 ms' when the plan beat the clock's...
```

*(One slip preserved rather than rewritten: commit `7954773`'s subject misdates the Stull
closed form as 1966 — the paper is Stull 2011, as `wbgt.ts` and this README cite it.)*

Full trail: `git log --format="%h %ci %s"`. The repo was created in this window, no prior project was
reused, and several AI coding tools were used during the build (explicitly permitted by the event
rules) — every commit is authored by the entrant. See `AUDIT.md` for the pre-submission adversarial
audit and its resolutions.

## Run it locally

```bash
npm install
npm test            # engine + validation + scenario-report tests
npm run typecheck
npm run build && npm run preview
python3 scripts/verify_serve.py     # serve smoke test

# regenerate the bundled real data or the evidence numbers
python3 scripts/fetch_fallback_data.py    # today's forecast, 7 cities
python3 scripts/fetch_hot_season.py       # real May 2025 heatwave window
node scripts/collect_evidence.mjs         # re-measures tests + wet-bulb deviation
node scripts/sync_provenance.mjs          # regenerates the provenance trail from git log
```

## Data and standards

- **Weather:** [Open-Meteo](https://open-meteo.com) forecast API and ERA5 historical archive —
  keyless, non-commercial/free licence, no account. Data is fetched either by the browser (live mode)
  or by the scripts above (bundled mode).
- **Heat strain:** ISO 7243 (WBGT) and the ACGIH TLV screening criteria for heat stress
  (2016 TLVs and BEIs, p. 218), as reproduced in the BC/WorkSafeBC *Hot Environments — Control
  Measures* fact sheet.
- **Water guidance:** OSHA *Water. Rest. Shade.* campaign baseline, scaled by metabolic rate and
  heat load.

## Limits and disclaimer

ShramShield is an **advisory planning tool**. It does not replace a site heat policy, a medical
opinion, or the law. Globe temperature and natural wet-bulb temperature are modelled, not measured;
allocation bands are applied at their midpoints; clothing adjustment is not applied. Where the
standard publishes no limit for a combination (heavy and very heavy continuous work), the engine
says so and steps down to the next published band rather than inventing a number.
