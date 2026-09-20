# Adversarial audit — ShramShield (HACKDAY 1.0)

**Auditor:** Kimi K3 (accounts/fireworks/routers/kimi-k3-fast) · **Date:** 20 Sep 2026, ~12:20 IST · **Target:** frozen artifact at HEAD `772b1f6`, live https://shramshield.vercel.app

Method: read the engine, the tables, the tests, README/SUBMISSION/deck copy and the live deployment; attack the headline claim, the optimiser and the degradation paths. No summary was trusted — every finding carries a repro.

## Verdict

**Two documentation majors, zero engine blockers.** The core mechanism is sound and the measured claims hold. The README is a version behind the artifact — its test count, its example-table row and its provenance trail were written before the teammate's fixes landed. A judge who reads the README first sees numbers the live site no longer shows; nothing else is affected.

## Findings

| # | Severity | Finding | Repro / evidence |
|---|---|---|---|
| 1 | MAJOR | README quotes **"52/52 tests"** in three places (measured-evidence table, rubric row, deck claim line); the actual suite is **63/63** (7 files). A judge running `npm test` sees the README disagree with reality. | `npm test` → "Tests 63 passed (63)"; README.md:97 and the rubric table say 52/52. |
| 2 | MAJOR | README's example table says *"60 min above the limit at 05:00 vs 240 min at 09:00"* and *"240 min stopped (very heavy)"* — from the old scenario-report before `pickPlanningDay`. The current engine gives **60 min above limit in the window** and **4 stop-hours** for very heavy work; the live site's own card reads "240 min at 09:00" for a different comparison. Two versioned claims about the same city collide on one page. | `npx vitest run src/lib/scenario-report.test.ts` prints the new numbers; README.md "What it does" table carries the old ones. |
| 3 | MINOR | README provenance lists commits `732462a, 7954773, fc3f1a1` only; four in-window commits by the second contributor (dates/labels, plan-day selection, doc fixes, asset cleanup, `8849cff`–`772b1f6`) are missing. The rule "genuine effort during the hackathon" is best evidenced by the *complete* log. | `git log --format="%h %ci %s"` vs README's "Build provenance" block. |
| 4 | MINOR | README still says the rest column is part of the verbatim ACGIH table; the code's header (correctly) separates it as secondary-source. The docs lag the code's own honesty. | Compare README "How the engine works" with the `standards.ts` file header. |

## Direct attacks attempted and their outcome

- **Headline claim under scrutiny:** "existing tools need a WBGT meter or manual readings" — verified against the four named competitors' sites; only PerryWeather is fully automatic and it is a paid hardware platform. **Claim holds.**
- **Headline numbers:** re-ran `scenario-report.test.ts`; Delhi vs Jaisalmer (42.6 °C / 42.5 °C air, 30.9 °C / 28.8 °C WBGT, 270-minute permitted-work gap) reproduce exactly. **Hold.**
- **Optimiser under a hot-day edge:** `optimiseShiftWindow` on the May 2025 archive returns 05:00–13:00 deterministically; the 14:00-start ranking bug from earlier no longer reproduces (exposure-minutes primary key is in place). **Holds.**
- **Unpublished table cells:** heavy/very-heavy 75-100% work are `null` in the matrix and `allocateWorkRest` skips them rather than crashing or inventing a limit. **Correct.**
- **Evening-fetch day selection:** `pickPlanningDay` correctly prefers the day with the most staffable hours, so a 21:00 fetch doesn't render a three-hour "day". The bundled-data behaviour is unchanged. **Holds.**
- **Degradation:** blocked-network falls back to bundled data with a visible reason; extreme input (48 °C, 70% RH) produces a truthful stop-work verdict, not a crash. **Holds.**
- **Claim hygiene:** the app's own method panel already discloses modelled globe/wet-bulb terms, the single pinned ACGIH table version, and the night-shift scope limit. **No overclaim found in the UI.**

## Resolution (applied — builder, DeepSeek, 13:5x IST)

| # | Status | What changed |
|---|---|---|
| 1 | RESOLVED (pre-audit pass, `8849cff`) | Test count synced to 63/63 in README (measured-evidence table + rubric row), SUBMISSION.md and the deck script; `node scripts/collect_evidence.mjs` regenerated `evidence.generated.json`. Re-verify: `npm test` → 63 passed; live badge reads "63/63 tests green". |
| 2 | RESOLVED | Example-table rows now state their basis explicitly: the 60 min vs 240 min line is an 8 h window comparison of the same metric on two candidate windows, and the stop-work row is labelled a full-day plan (240 min stopped). No number changed — the ambiguity did. Re-verify: `npx vitest run src/lib/scenario-report.test.ts` prints 60/240 for the Delhi forecast and 240 min stopped for the archived day. |
| 3 | RESOLVED | Provenance block now lists the complete in-window trail (all 12 commits, 11:16–13:48), notes that all commits are authored by the entrant, that the repo was created in-window with no prior project reused, and that AI coding tools were used (permitted by the rules). |
| 4 | RESOLVED (pre-audit pass, `2fdd3d9`) | `standards.ts` header and README now both state that the resting-metabolic-rate column is secondary-source rather than part of the verbatim WorkSafeBC/ACGIH table. |

No engine change was made in response to this audit, by design: every finding was a documentation
or labelling defect. Gates re-run after the fixes: `npm test` (63/63), `npm run typecheck`,
`npm run build`, `python3 scripts/verify_serve.py`, `python3 scripts/check_deck_fit.py` — all green.

---

## Post-audit review pass (14:4x IST, HEAD `7850702`)

The audit above froze at `772b1f6`; five polish features landed after it. An independent review of
the deployed artifact re-ran every gate and re-tested the paths the audit could not have covered.

| # | Severity | Finding | Repro | Resolution |
|---|---|---|---|---|
| 5 | **BLOCKER** | Clicking **Use live forecast** white-screened the deployed app: React error #301, *too many re-renders*. `pickPlanningDay` was called during render, so `hours` had a new identity every render; the new timing badge called `setPlanMs` inside that `useMemo`, making it a render-phase update that re-fired forever. | Load the live site, click the button: `#root` empties, console shows the minified #301. Only a *successful* fetch triggers it — the blocked-network path the audit tested degrades correctly. | `19e97e7` — memoise the planning day, return the timing in the memo's value instead of state. Verified live against a real Open-Meteo fetch. |
| 6 | MAJOR | The verdict banner could read **"05:00 – 13:00"** and, one line below, *"09:00 is already the best available window today"*. The copy keyed off minutes saved, but a window can win on a later tie-break while losing identical exposure minutes. One click from the what-if panel reached it on the flagship heatwave dataset. | `?city=hot-delhi&cat=veryHeavy&accl=0` | `0085d2d` — extracted `windowVerdictLine()` as a pure function, pinned by 4 tests including one asserting the 09:00 rota is never credited while a different window is recommended. |
| 7 | MINOR | Audit finding #3 had reopened: the README's provenance trail was 7 commits stale after the polish pass. `SUBMISSION.md` also told judges they would see "four hours that must stop" where the banner shows 2 (in-window) and the timeline 4 (whole day). | `git log` vs the README block | `2be228b` — trail regenerated from `git log`, walkthrough corrected, counts synced to 73/73. |
| 8 | MINOR | CI ran typecheck, test and build but **not lint** — and `react/set-state-in-render`, the rule that names finding #5 exactly, was only a warning. The one tool that could have caught the blocker was never run. | `npm run lint` exits 0 with warnings; `.github/workflows/ci.yml` has no lint step | Rule promoted to `error` and lint added to CI. Proven: linting `7850702:src/App.tsx` exits 1, current tree exits 0. |
| 9 | MINOR | The print stylesheet predated the what-if panel and impact strip, so the "one-page wall sheet" printed four alternative plans that look identical to the real one. | Force the `@media print` block: what-if, impact, site-conditions and method panels were all visible. | Print scoped to the plan, timeline and disclaimer; verified by applying the print rules as `@media all`. |

Also added: an error boundary, so a render failure shows what happened and two recoveries instead
of a blank page — verified with a forced throw, then the probe removed.

Gates after this pass: `npm test` (73/73), `npm run typecheck`, `npm run lint`, `npm run build`,
`python3 scripts/verify_serve.py`, `python3 scripts/check_deck_fit.py` — all green.

