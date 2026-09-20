import { EVIDENCE } from '../lib/evidence';
import { WORK_CATEGORIES } from '../lib/standards';

/**
 * Method + evidence panel.
 *
 * A standards-based tool lives or dies on this panel: what was computed, from which
 * published table, what is an estimate, and what has actually been measured. The measured
 * numbers come from src/lib/evidence.generated.json, written by scripts/collect_evidence.mjs.
 */
export function MethodPanel() {
  const validation = EVIDENCE.wetBulbValidation;
  const tests = EVIDENCE.tests;

  return (
    <section className="panel" aria-labelledby="method-heading">
      <h2 id="method-heading">How this is computed, and what we have not proven</h2>

      <div className="method-grid">
        <div>
          <h3>The heat metric</h3>
          <pre className="formula">
{`WBGT = 0.7·Tnwb + 0.2·Tg + 0.1·Tdb     (outdoor, with solar load)`}
          </pre>
          <ul className="tight">
            <li>
              <strong>Tdb</strong> — air temperature, straight from the forecast.
            </li>
            <li>
              <strong>Tnwb</strong> — natural wet bulb, approximated by the psychrometric wet bulb
              using the Stull (2011) closed form. Natural wet bulb runs slightly warmer in still air,
              so this can <em>under-state</em> WBGT by a fraction of a degree. Disclosed, not hidden.
            </li>
            <li>
              <strong>Tg</strong> — globe temperature, <em>estimated</em> from shortwave radiation and
              wind: zero sunlight collapses it to the air temperature, and the solar gain is damped
              by wind. This is our model, not a measurement.
            </li>
          </ul>
        </div>

        <div>
          <h3>The limits</h3>
          <ul className="tight">
            <li>
              Work/rest allocation and screening WBGT values are the ACGIH TLV screening criteria
              (2016 TLVs and BEIs, p. 218), reproduced verbatim in the engine rather than paraphrased,
              with separate tables for acclimatised and unacclimatised workers. One exception is
              documented in the code rather than glossed over: the resting-metabolic-rate column comes
              from secondary ACGIH references, not from that table.
            </li>
            <li>ISO 7243 supplies the WBGT definition and the outdoor weighting used here.</li>
            <li>
              Allocation bands are reported as their midpoints (e.g. the 75-100% band is planned as
              53 minutes of work per hour).
            </li>
            <li>
              Water guidance scales OSHA's Water.Rest.Shade baseline (about 250 ml every 20 minutes)
              by metabolic rate and heat load, capped at 1.2 l/h. It is guidance, not a prescription.
            </li>
          </ul>
        </div>
      </div>

      <h3>Measured, not asserted</h3>
      <ul className="tight">
        <li>
          <strong>{tests.passed}/{tests.total} engine tests pass</strong> across {tests.files} files
          (<code>{tests.command}</code>). They pin the published table values, the formula's physical
          properties, the allocation arithmetic and the demo's own narrative.
        </li>
        <li>
          <strong>Wet bulb agrees with an independent implementation:</strong> mean absolute
          deviation {validation.meanAbsDeviationC} °C and worst case {validation.maxAbsDeviationC} °C
          across {validation.hoursChecked} real forecast hours in {validation.cities} Indian cities, against{' '}
          {validation.reference}.
        </li>
        <li>{validation.scope}</li>
      </ul>

      <h3>Work-rate categories used</h3>
      <ul className="categories">
        {WORK_CATEGORIES.map((category) => (
          <li key={category.id}>
            <strong>{category.label}</strong> <span className="muted">{category.metabolicRateW} W</span>
            <br />
            <span className="muted">{category.examples}</span>
          </li>
        ))}
      </ul>

      <h3>Known limits of this build</h3>
      <ul className="tight muted">
        <li>Night-shift planning is out of scope; candidate start times run 05:00-14:00.</li>
        <li>Globe temperature is modelled from radiation and wind, not measured on site.</li>
        <li>
          Clothing adjustment (heavy PPE adds several degrees to effective WBGT) is not applied —
          the tables assume standard work clothing.
        </li>
        <li>
          Work/rest plans are advisory. They do not replace a site heat policy or medical advice.
        </li>
      </ul>
      <p className="panel-note">
        Evidence generated {new Date(EVIDENCE.generatedAt).toLocaleString('en-IN')} by{' '}
        <code>{EVIDENCE.generatedBy}</code>.
      </p>
    </section>
  );
}
