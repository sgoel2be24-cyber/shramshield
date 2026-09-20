import { useCallback, useEffect, useMemo, useState } from 'react';
import { FALLBACK_CITIES, HOT_SCENARIOS, dayLabel, pickPlanningDay, scenarioBySlug, type FetchedHour } from './lib/fallback';
import { optimiseShiftWindow, planShift } from './lib/plan';
import { WORK_CATEGORIES, type WorkCategory } from './lib/standards';
import { fetchLiveForecast, type LiveForecast } from './lib/live';
import { EVIDENCE } from './lib/evidence';
import { isCustomPlan, planFromSearch, planToSearch, type ShareablePlan } from './lib/share';
import { PlanView } from './components/PlanView';
import { ImpactStrip } from './components/ImpactStrip';
import { WhatIfPanel, type WhatIfScenario } from './components/WhatIfPanel';
import { ManualConditions } from './components/ManualConditions';
import { MethodPanel } from './components/MethodPanel';
import './App.css';

const SHIFT_LENGTHS = [6, 8, 9, 10] as const;

type LiveState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; forecast: LiveForecast }
  | { status: 'error'; message: string };

export default function App() {
  const initialPlan = useMemo(() => planFromSearch(window.location.search), []);
  const [slug, setSlug] = useState(initialPlan.slug);
  const [category, setCategory] = useState<WorkCategory>(initialPlan.category);
  const [acclimatised, setAcclimatised] = useState(initialPlan.acclimatised);
  const [shiftLength, setShiftLength] = useState<number>(initialPlan.shiftLength);
  const [live, setLive] = useState<LiveState>({ status: 'idle' });

  const scenario = useMemo(() => scenarioBySlug(slug), [slug]);

  const bundledHours = useMemo(() => pickPlanningDay(scenario.hours), [scenario]);

  // Memoised on the live forecast itself: pickPlanningDay builds fresh arrays, so computing it
  // during render gave `hours` a new identity every render, which defeated every useMemo below
  // and — once the timing badge started setting state from one of them — looped the render.
  const liveHours = useMemo(
    () => (live.status === 'ready' ? pickPlanningDay(live.forecast.hours) : null),
    [live],
  );
  const hours: FetchedHour[] = useMemo(
    () => (liveHours && liveHours.length > 0 ? liveHours : bundledHours),
    [liveHours, bundledHours],
  );

  // The badge measures the real computation, so the timing rides along in the memo's value and
  // is derived during render. It must not be state written from inside useMemo: that is a
  // render-phase update, and with a fresh `hours` array each render it loops until React
  // throws "too many re-renders".
  const planned = useMemo(() => {
    const started = performance.now();
    const result = planShift(hours, category, acclimatised);
    return { result, ms: Math.round((performance.now() - started) * 10) / 10 };
  }, [hours, category, acclimatised]);
  const plan = planned.result;
  const planMs = planned.ms;
  const windowResult = useMemo(
    () => optimiseShiftWindow(hours, category, acclimatised, shiftLength),
    [hours, category, acclimatised, shiftLength],
  );

  // The three comparison plans — same dataset, same engine, different controls. Built with
  // useMemo so switching the main controls re-plans them too.
  const whatIfScenarios = useMemo<WhatIfScenario[]>(() => {
    const defs: { id: string; label: string; description: string; category: WorkCategory; acclimatised: boolean }[] = [
      {
        id: 'heavier',
        label: 'Very heavy work',
        description: 'Same day, digging / shovelling pace',
        category: 'veryHeavy',
        acclimatised,
      },
      {
        id: 'new-crew',
        label: 'New / returning worker',
        description: 'Same work rate, lower published limits',
        category,
        acclimatised: false,
      },
      {
        id: 'heavier-new',
        label: 'Very heavy, new worker',
        description: 'The combination with the strictest plan',
        category: 'veryHeavy',
        acclimatised: false,
      },
    ];
    return defs
      .filter((def) => !(def.category === category && def.acclimatised === acclimatised))
      .map((def) => ({
        ...def,
        plan: planShift(hours, def.category, def.acclimatised),
        window: optimiseShiftWindow(hours, def.category, def.acclimatised, shiftLength),
      }));
  }, [hours, category, acclimatised, shiftLength]);

  const sourceLabel =
    live.status === 'ready'
      ? `Live forecast · ${scenario.name} · fetched ${new Date(live.forecast.fetchedAtIso).toLocaleTimeString('en-IN')}`
      : scenario.kind === 'historical'
        ? `${scenario.name} · real archive data, ${dayLabel(hours)}`
        : `${scenario.name} · bundled forecast, ${dayLabel(hours)}`;

  const runLive = useCallback(async () => {
    setLive({ status: 'loading' });
    try {
      const forecast = await fetchLiveForecast(scenario.latitude, scenario.longitude);
      setLive({ status: 'ready', forecast });
    } catch (error) {
      setLive({
        status: 'error',
        message: error instanceof Error ? error.message : 'unknown error',
      });
    }
  }, [scenario.latitude, scenario.longitude]);

  const useBundled = useCallback(() => setLive({ status: 'idle' }), []);

  // Keep the address bar carrying the current plan, so a bookmark or a shared link restores it.
  // replaceState only — no history spam while a judge moves a slider.
  useEffect(() => {
    const plan: ShareablePlan = { slug, category, acclimatised, shiftLength };
    const next = isCustomPlan(plan) ? planToSearch(plan) : window.location.pathname;
    const current = window.location.pathname + window.location.search;
    if (next !== current && next !== window.location.search) {
      window.history.replaceState(null, '', next);
    }
  }, [slug, category, acclimatised, shiftLength]);

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>
            Shram<span className="brand-accent">Shield</span>
          </h1>
          <p className="tagline">
            Turns a weather forecast into an enforceable heat-safety shift plan for outdoor workers —
            WBGT, work/rest cycles and water, from published standards.
          </p>
        </div>
        <div className="badge-row">
          <span className="badge">ISO 7243 WBGT</span>
          <span className="badge">ACGIH work/rest tables</span>
          <span className="badge badge-good">
            {EVIDENCE.tests.passed}/{EVIDENCE.tests.total} tests green
          </span>
          <span className="badge badge-good">plan computed in {planMs} ms</span>
        </div>
      </header>

      <main className="layout">
        <aside className="controls" aria-label="Plan controls">
          <section className="control-group">
            <h2>Location &amp; date</h2>
            <label htmlFor="scenario">Dataset</label>
            <select id="scenario" value={slug} onChange={(event) => setSlug(event.target.value)}>
              <optgroup label="Bundled forecast — 20 Sep 2026">
                {FALLBACK_CITIES.map((city) => (
                  <option key={city.slug} value={city.slug}>
                    {city.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Real heatwave archive — May 2025">
                {HOT_SCENARIOS.map((cityDoc) => (
                  <option key={cityDoc.slug} value={cityDoc.slug}>
                    {cityDoc.name}
                  </option>
                ))}
              </optgroup>
            </select>
            <div className="live-row">
              {scenario.kind === 'forecast' ? (
                <>
                  <button type="button" onClick={runLive} disabled={live.status === 'loading'}>
                    {live.status === 'loading' ? 'Fetching…' : `Use live forecast for ${scenario.name}`}
                  </button>
                  {live.status !== 'idle' ? (
                    <button type="button" className="ghost" onClick={useBundled}>
                      Bundled
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
            <p className="hint" role="status">
              {scenario.kind === 'historical'
                ? 'Archive scenario from a real recorded heatwave — a live forecast does not apply to a past date.'
                : live.status === 'error'
                  ? `Live forecast unavailable (${live.message}) — planning from bundled real data instead.`
                  : live.status === 'ready'
                    ? 'Live forecast loaded from Open-Meteo.'
                    : 'Bundled data needs no network. Live forecast is optional.'}
            </p>
          </section>

          <section className="control-group">
            <h2>Work rate</h2>
            <div className="chip-grid">
              {WORK_CATEGORIES.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={entry.id === category ? 'chip chip-on' : 'chip'}
                  onClick={() => setCategory(entry.id)}
                  aria-pressed={entry.id === category}
                >
                  {entry.label}
                  <span className="chip-sub">{entry.metabolicRateW} W</span>
                </button>
              ))}
            </div>
          </section>

          <section className="control-group">
            <h2>Crew</h2>
            <div className="toggle-row">
              <button
                type="button"
                className={acclimatised ? 'chip chip-on' : 'chip'}
                onClick={() => setAcclimatised(true)}
                aria-pressed={acclimatised}
              >
                Acclimatised
              </button>
              <button
                type="button"
                className={!acclimatised ? 'chip chip-on' : 'chip'}
                onClick={() => setAcclimatised(false)}
                aria-pressed={!acclimatised}
              >
                New / returning worker
              </button>
            </div>
            <p className="hint">
              Unacclimatised workers have lower published limits — the plan tightens automatically.
            </p>
          </section>

          <section className="control-group">
            <h2>Shift length</h2>
            <div className="toggle-row">
              {SHIFT_LENGTHS.map((length) => (
                <button
                  key={length}
                  type="button"
                  className={length === shiftLength ? 'chip chip-on' : 'chip'}
                  onClick={() => setShiftLength(length)}
                  aria-pressed={length === shiftLength}
                >
                  {length} h
                </button>
              ))}
            </div>
          </section>

          <section className="control-group">
            <h2>Scope</h2>
            <p className="hint">
              Built for Indian outdoor work: construction, farm labour, delivery, sanitation. Works on any
              city with a forecast — the standards do not care about borders.
            </p>
          </section>
        </aside>

        <div className="content">
          <PlanView
            plan={plan}
            window={windowResult}
            category={category}
            acclimatised={acclimatised}
            sourceLabel={sourceLabel}
            textMeta={{
              locationName: scenario.name,
              dataLabel: dayLabel(hours),
              categoryLabel:
                WORK_CATEGORIES.find((entry) => entry.id === category)?.label ?? category,
              acclimatised,
            }}
          />
          <WhatIfPanel
            current={{ category, acclimatised, plan, window: windowResult }}
            scenarios={whatIfScenarios}
            onApply={(nextCategory, nextAcclimatised) => {
              setCategory(nextCategory);
              setAcclimatised(nextAcclimatised);
            }}
          />
          <ImpactStrip />
          <ManualConditions category={category} acclimatised={acclimatised} />
          <MethodPanel />
          <footer className="footer">
            <p>
              ShramShield — built during HACKDAY 1.0 (DECODEP community), 20 September 2026, in an 8-hour
              window. Standards: ISO 7243 (WBGT), ACGIH TLV screening criteria for heat stress; weather data
              from Open-Meteo (keyless). Core engine and standards tables are hand-written and unit-tested.
            </p>
            <p className="muted">
              Advisory tool. It does not replace a site heat policy, a medical opinion, or local law.
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
