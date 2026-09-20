#!/usr/bin/env node
/**
 * Collect measured evidence into src/lib/evidence.generated.json.
 *
 * Rule this exists to enforce: a claim ships only with a measurement. The UI does not state
 * "48 tests pass" or "wet-bulb matches an independent implementation" as prose — it renders
 * numbers this script measured by actually running the suite and recomputing the deviation
 * from the bundled real data. Re-run it before submitting or quoting anything.
 *
 *   node scripts/collect_evidence.mjs
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fallbackDir = path.join(root, 'src', 'lib', 'fallback');

/** Stull (2011) closed form, independently implemented here to check the app's version. */
function psychrometricWetBulb(dryBulbC, rhPercent) {
  const rh = Math.min(Math.max(rhPercent, 1), 100);
  const t = dryBulbC;
  return (
    t * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
    Math.atan(t + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
    4.686035
  );
}

function measureValidation() {
  const files = readdirSync(fallbackDir).filter((name) => name.endsWith('.json') && name !== 'index.json');
  const deviations = [];
  const cities = new Set();
  let hoursChecked = 0;

  for (const file of files) {
    const doc = JSON.parse(readFileSync(path.join(fallbackDir, file), 'utf8'));
    if (doc.kind === 'historical' || file.startsWith('hot-')) continue;
    for (const hour of doc.hours ?? []) {
      if (typeof hour.meteoWetBulbC !== 'number') continue;
      hoursChecked += 1;
      cities.add(doc.slug);
      deviations.push(Math.abs(psychrometricWetBulb(hour.dryBulbC, hour.relativeHumidity) - hour.meteoWetBulbC));
    }
  }

  const sum = deviations.reduce((total, value) => total + value, 0);
  return {
    hoursChecked,
    cities: cities.size,
    meanAbsDeviationC: Number((sum / deviations.length).toFixed(3)),
    maxAbsDeviationC: Number(Math.max(...deviations).toFixed(3)),
    reference: "Open-Meteo 'wet_bulb_temperature_2m' — an independent implementation of the wet-bulb term",
    scope: 'Validates the wet-bulb term only. The globe-temperature term is an estimate with no external check.',
  };
}

function measureTests() {
  const outputFile = path.join(root, 'node_modules', '.tmp', 'vitest-evidence.json');
  execFileSync('npx', ['vitest', 'run', '--reporter=json', `--outputFile=${outputFile}`], {
    cwd: root,
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  const report = JSON.parse(readFileSync(outputFile, 'utf8'));
  const failed = report.numFailedTests ?? 0;
  if (failed > 0) {
    throw new Error(`${failed} tests failed — refusing to publish evidence from a red suite`);
  }
  return {
    total: report.numTotalTests,
    passed: report.numPassedTests,
    files: report.testResults?.length ?? 0,
    command: 'npm test',
  };
}

const evidence = {
  generatedAt: new Date().toISOString(),
  generatedBy: 'scripts/collect_evidence.mjs',
  tests: measureTests(),
  wetBulbValidation: measureValidation(),
};

const outPath = path.join(root, 'src', 'lib', 'evidence.generated.json');
writeFileSync(outPath, JSON.stringify(evidence, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(evidence, null, 2));
