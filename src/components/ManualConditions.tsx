import type { ForecastHour } from '../lib/plan';
import { computeWbgt } from '../lib/wbgt';
import { allocateWorkRest, waterMlPerHour, type WorkCategory } from '../lib/standards';
import { useMemo, useState } from 'react';

interface ManualConditionsProps {
  category: WorkCategory;
  acclimatised: boolean;
}

/**
 * Site-conditions panel: the four inputs a supervisor can actually observe, turned into the
 * same plan the forecast produces. This is also the offline path — no network, no key.
 */
export function ManualConditions({ category, acclimatised }: ManualConditionsProps) {
  const [dryBulbC, setDryBulbC] = useState(36);
  const [relativeHumidity, setRelativeHumidity] = useState(40);
  const [windMs, setWindMs] = useState(1);
  const [solarWm2, setSolarWm2] = useState(700);

  const hourResult = useMemo(() => {
    const input: ForecastHour = {
      timeIso: 'manual',
      hourLabel: 'manual',
      dryBulbC,
      relativeHumidity,
      windMs,
      solarWm2,
    };
    const wbgt = computeWbgt(input);
    const allocation = allocateWorkRest(wbgt.wbgtC, category, acclimatised);
    return { wbgt, allocation, waterMl: waterMlPerHour(wbgt.wbgtC, category) };
  }, [dryBulbC, relativeHumidity, windMs, solarWm2, category, acclimatised]);

  const controls: {
    id: string;
    label: string;
    unit: string;
    min: number;
    max: number;
    step: number;
    value: number;
    onChange: (value: number) => void;
  }[] = [
    { id: 'temp', label: 'Air temperature', unit: '°C', min: 20, max: 50, step: 0.5, value: dryBulbC, onChange: setDryBulbC },
    { id: 'humidity', label: 'Relative humidity', unit: '%', min: 5, max: 100, step: 1, value: relativeHumidity, onChange: setRelativeHumidity },
    { id: 'wind', label: 'Wind speed', unit: 'm/s', min: 0, max: 8, step: 0.1, value: windMs, onChange: setWindMs },
    { id: 'solar', label: 'Solar radiation', unit: 'W/m²', min: 0, max: 1200, step: 25, value: solarWm2, onChange: setSolarWm2 },
  ];

  const stop = hourResult.allocation.mustStopWork;

  return (
    <section className="panel" aria-labelledby="manual-heading">
      <h2 id="manual-heading">Site conditions</h2>
      <p className="panel-note">
        Four numbers a supervisor can read off a weather app or a site thermometer. Everything
        below is computed in the browser — no server, no key, no data leaves the page.
      </p>
      <div className="manual-grid">
        <div className="manual-controls">
          {controls.map((control) => (
            <label className="slider" key={control.id} htmlFor={control.id}>
              <span className="slider-label">
                {control.label}
                <output htmlFor={control.id}>
                  {control.value}
                  {control.unit ? ` ${control.unit}` : ''}
                </output>
              </span>
              <input
                id={control.id}
                type="range"
                min={control.min}
                max={control.max}
                step={control.step}
                value={control.value}
                onChange={(event) => control.onChange(Number(event.target.value))}
              />
            </label>
          ))}
        </div>
        <div className="manual-result">
          <div className="wbgt-readout">
            <span className="readout-label">WBGT now</span>
            <strong className="readout-value">{hourResult.wbgt.wbgtC.toFixed(1)}°C</strong>
            <span className="readout-sub">
              wet bulb {hourResult.wbgt.wetBulbC.toFixed(1)}°C · globe {hourResult.wbgt.globeC.toFixed(1)}°C
            </span>
          </div>
          <dl className="mini-stats">
            <div>
              <dt>Work / rest per hour</dt>
              <dd>
                {hourResult.allocation.workMinutesPerHour} / {hourResult.allocation.restMinutesPerHour} min
              </dd>
            </div>
            <div>
              <dt>Allocation band</dt>
              <dd>{hourResult.allocation.band}</dd>
            </div>
            <div>
              <dt>Water per hour</dt>
              <dd>{hourResult.waterMl} ml</dd>
            </div>
          </dl>
          <p className={stop ? 'verdict verdict-stop' : 'verdict verdict-ok'} role="status">
            {stop
              ? 'Above every published limit for this work rate — stop work.'
              : `Work ${hourResult.allocation.workMinutesPerHour} minutes, rest ${hourResult.allocation.restMinutesPerHour} minutes each hour.`}
          </p>
        </div>
      </div>
    </section>
  );
}
