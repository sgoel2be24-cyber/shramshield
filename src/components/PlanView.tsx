import type { PlannedHour, ShiftPlan, ShiftWindowCandidate, ShiftWindowResult } from '../lib/plan';
import type { WorkCategory } from '../lib/standards';
import { firstDayHours, scenarioBySlug } from '../lib/fallback';
import { planShift } from '../lib/plan';

interface PlanViewProps {
  plan: ShiftPlan;
  window: ShiftWindowResult;
  category: WorkCategory;
  acclimatised: boolean;
  sourceLabel: string;
}

const STATUS_LABEL: Record<PlannedHour['status'], string> = {
  continuous: 'Work through',
  caution: 'Short breaks',
  high: 'Long breaks',
  extreme: 'Minimal work',
  stop: 'STOP WORK',
};

/** Timeline display window: the hours a supervisor can realistically staff. */
const DISPLAY_START_HOUR = 5;
const DISPLAY_END_HOUR = 20;

/** Drinking water summed over the recommended window only, not the whole dataset. */
function windowWaterLitres(plan: ShiftPlan, best: ShiftWindowCandidate | null): number {
  if (!best) return 0;
  const inWindow = plan.hours.slice(best.startIndex, best.endIndexExclusive);
  const millilitres = inWindow.reduce((sum, hour) => sum + hour.waterMl, 0);
  return Math.round((millilitres / 1000) * 10) / 10;
}

export function PlanView({ plan, window, category, acclimatised, sourceLabel }: PlanViewProps) {
  const best = window.best;
  const naive = window.naive;
  const savedMinutes =
    best && naive ? Math.max(0, naive.exposureMinutes - best.exposureMinutes) : 0;
  // Hours where work must stop *inside the recommended shift* — the banner speaks about this
  // shift, so counting the whole dataset would overstate it. Falls back to the day if there is
  // no window to recommend.
  const stopHours = plan.hours
    .map((hour, index) => ({ hour, index }))
    .filter(({ hour, index }) => {
      if (!hour.allocation.mustStopWork) return false;
      if (!best) return true;
      return index >= best.startIndex && index < best.endIndexExclusive;
    })
    .map(({ hour }) => hour);

  return (
    <section className="panel" aria-labelledby="plan-heading">
      <div className="panel-head">
        <h2 id="plan-heading">Today&rsquo;s shift plan</h2>
        <span className="source-chip">{sourceLabel}</span>
      </div>

      <div className="verdict-hero" aria-live="polite">
        {best ? (
          <>
            <p className="hero-kicker">Recommended shift window</p>
            <p className="hero-window">
              {best.startLabel} &ndash; {best.endLabel}
            </p>
            <p className="hero-line">
              {savedMinutes > 0
                ? `Starting at ${best.startLabel} instead of 09:00 keeps ${savedMinutes} minutes of the shift out of the danger zone.`
                : `09:00 is already the best available window today — the whole day is hot.`}
            </p>
          </>
        ) : (
          <p className="hero-line">Not enough hours in this dataset to fit the requested shift.</p>
        )}
        {stopHours.length > 0 ? (
          <p className="hero-stop">
            {stopHours.length === 1
              ? 'One hour of this shift exceeds every published limit for this work rate and must stop.'
              : `${stopHours.length} hours of this shift exceed every published limit for this work rate and must stop.`}{' '}
            ({stopHours.map((hour) => hour.hourLabel).join(', ')})
          </p>
        ) : null}
      </div>

      <div className="metric-row">
        <Metric label="Peak WBGT" value={`${plan.peakWbgtC.toFixed(1)} °C`} hint="worst hour in the day" />
        <Metric
          label="Limit for this work rate"
          value={`${plan.continuousLimitC.toFixed(1)} °C`}
          hint={plan.peakWbgtC > plan.continuousLimitC ? 'exceeded today' : 'not exceeded today'}
          tone={plan.peakWbgtC > plan.continuousLimitC ? 'warn' : 'ok'}
        />
        <Metric
          label="Work permitted"
          value={best ? minutesToHuman(best.permittedWorkMinutes) : '—'}
          hint={`in the recommended ${best?.startLabel ?? ''}–${best?.endLabel ?? ''} window`}
        />
        <Metric
          label="Water for the crew"
          value={`${windowWaterLitres(plan, best)} L`}
          hint="per worker, in that window"
        />
      </div>

      {best && naive && best.startIndex !== naive.startIndex ? (
        <table className="compare">
          <thead>
            <tr>
              <th scope="col">Shift window</th>
              <th scope="col">Minutes above the limit</th>
              <th scope="col">Peak WBGT</th>
              <th scope="col">Work permitted</th>
            </tr>
          </thead>
          <tbody>
            <tr className="row-best">
              <th scope="row">{best.startLabel} start (recommended)</th>
              <td>{best.exposureMinutes} min</td>
              <td>{best.peakWbgtC.toFixed(1)} °C</td>
              <td>{minutesToHuman(best.permittedWorkMinutes)}</td>
            </tr>
            <tr>
              <th scope="row">{naive.startLabel} start (default rota)</th>
              <td>{naive.exposureMinutes} min</td>
              <td>{naive.peakWbgtC.toFixed(1)} °C</td>
              <td>{minutesToHuman(naive.permittedWorkMinutes)}</td>
            </tr>
          </tbody>
        </table>
      ) : null}

      <h3 className="timeline-heading">Hour by hour</h3>
      <p className="panel-note">
        Daytime hours only — planning runs {String(DISPLAY_START_HOUR).padStart(2, '0')}:00 to{' '}
        {String(DISPLAY_END_HOUR).padStart(2, '0')}:00, inside the window a supervisor can realistically
        staff. Hours highlighted in green fall inside the recommended shift.
      </p>
      <ol className="timeline">
        {plan.hours.map((hour, index) => ({ hour, index })).filter(({ hour }) => {
          const startHour = Number.parseInt(hour.hourLabel.slice(0, 2), 10);
          return startHour >= DISPLAY_START_HOUR && startHour <= DISPLAY_END_HOUR;
        }).map(({ hour, index }) => (
          <HourCard
            key={hour.timeIso}
            hour={hour}
            limitC={plan.continuousLimitC}
            inWindow={Boolean(best && index >= best.startIndex && index < best.endIndexExclusive)}
          />
        ))}
      </ol>

      <ComparisonStrip category={category} acclimatised={acclimatised} />
    </section>
  );
}

function Metric({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint: string;
  tone?: 'neutral' | 'ok' | 'warn';
}) {
  return (
    <div className={`metric metric-${tone}`}>
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      <span className="metric-hint">{hint}</span>
    </div>
  );
}

function HourCard({
  hour,
  limitC,
  inWindow,
}: {
  hour: PlannedHour;
  limitC: number;
  inWindow: boolean;
}) {
  const workPercent = Math.round((hour.workMinutes / 60) * 100);
  return (
    <li className={`hour hour-${hour.status}${inWindow ? ' hour-in-window' : ''}`}>
      <div className="hour-top">
        <span className="hour-time">{hour.hourLabel}</span>
        <span className="hour-status">{inWindow ? 'In shift' : STATUS_LABEL[hour.status]}</span>
      </div>
      <div className="hour-wbgt">
        <strong>{hour.wbgtC.toFixed(1)}</strong>
        <span className="unit">°C WBGT</span>
      </div>
      <div className="bar" role="img" aria-label={`${hour.workMinutes} minutes work, ${hour.restMinutes} minutes rest`}>
        <span className="bar-work" style={{ width: `${workPercent}%` }} />
      </div>
      <p className="hour-detail">
        {hour.workMinutes} min work / {hour.restMinutes} min rest &middot; {hour.waterMl} ml
      </p>
      <p className="hour-detail muted">
        air {hour.dryBulbC.toFixed(0)}°C, {hour.aboveContinuousLimit ? `+${hour.exceedanceC.toFixed(1)}°C over limit` : 'within limit'}{' '}
        ({limitC.toFixed(1)}°C)
      </p>
    </li>
  );
}

/**
 * The single most persuasive thing in this app, and it is two real archived days:
 * the same thermometer reading, different physiological load. Dry-bulb alerts cannot see it.
 */
function ComparisonStrip({ category, acclimatised }: { category: WorkCategory; acclimatised: boolean }) {
  const rows = [scenarioBySlug('hot-delhi'), scenarioBySlug('hot-jaisalmer')].map((scenario) => {
    const day = firstDayHours(scenario.hours);
    const plan = planShift(day, category, acclimatised);
    return {
      name: scenario.name,
      peakDryBulb: Math.max(...day.map((hour) => hour.dryBulbC)),
      peakWbgt: plan.peakWbgtC,
      permittedWorkMinutes: plan.permittedWorkMinutes,
      dayLengthMinutes: day.length * 60,
    };
  });

  const [delhi, jaisalmer] = rows;
  if (!delhi || !jaisalmer) return null;
  const wbgtGap = Math.round((delhi.peakWbgt - jaisalmer.peakWbgt) * 10) / 10;
  const workGapMinutes = jaisalmer.permittedWorkMinutes - delhi.permittedWorkMinutes;

  return (
    <div className="comparison">
      <h3>Same thermometer, different danger</h3>
      <p className="panel-note">
        Two real days from Open-Meteo&rsquo;s ERA5 archive (20 May 2025). A dry-bulb heat alert treats
        them as the same day. They are not.
      </p>
      <div className="comparison-grid">
        {rows.map((row) => (
          <div className="comparison-card" key={row.name}>
            <h4>{row.name}</h4>
            <dl className="mini-stats">
              <div>
                <dt>Peak air temperature</dt>
                <dd>{row.peakDryBulb.toFixed(1)} °C</dd>
              </div>
              <div>
                <dt>Peak WBGT</dt>
                <dd>{row.peakWbgt.toFixed(1)} °C</dd>
              </div>
              <div>
                <dt>Work permitted across the day</dt>
                <dd>
                  {Math.floor(row.permittedWorkMinutes / 60)} h {row.permittedWorkMinutes % 60} m of{' '}
                  {Math.floor(row.dayLengthMinutes / 60)} h
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
      <p className="comparison-conclusion">
        Air temperatures within {Math.abs(delhi.peakDryBulb - jaisalmer.peakDryBulb).toFixed(1)} °C of each
        other, yet Delhi&rsquo;s humidity pushes WBGT {wbgtGap} °C higher and costs{' '}
        {Math.floor(workGapMinutes / 60)} h {workGapMinutes % 60} m of permitted work for the same
        crew. That difference is invisible to any alert built on temperature alone.
      </p>
    </div>
  );
}

function minutesToHuman(minutes: number): string {
  return `${Math.floor(minutes / 60)} h ${minutes % 60} m`;
}

export type { ShiftWindowCandidate };
