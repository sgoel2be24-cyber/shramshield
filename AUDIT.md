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

## Resolution (to be applied by the builder)

1. Update the README test count to 63/63 in all three places and re-run `node scripts/collect_evidence.mjs` so the in-app badge and docs agree.
2. Rewrite the README example table to the current scenario-report numbers (60 min above limit in the recommended window; 4 stop-hours for very heavy work) and make the 09:00 comparison explicit that it is a different metric (240 min above limit at 09:00, whole day).
3. Extend the provenance block with the full in-window commit list.
4. Align the README's standards-provenance sentence with the code header (rest column is secondary-source).

All four fixes are documentation-only; no engine change is required, and none should be made from this audit.
