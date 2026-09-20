/**
 * Shift planning + shift-window optimisation — ShramShield.
 *
 * Two things happen here, and the second one is the part that is ours rather than the standard's:
 *
 *  1. planShift() turns an hourly forecast into an enforceable day plan: per hour, the WBGT,
 *     the permissible work/rest split, the water requirement, and whether work must stop.
 *  2. optimiseShiftWindow() searches candidate start times for a shift of a given length and
 *     returns the window that minimises heat exposure above the category's continuous-work
 *     limit. Every existing WBGT tool answers "how hot is it"; this answers "when should this
 *     crew work today", which is the decision a supervisor actually has to make.
 */

import {
  computeWbgt,
  round1,
  type WbgtInput,
  type WbgtResult,
} from './wbgt';
import {
  ABSOLUTE_STOP_WBGT_C,
  ACCLIMATISED_LIMITS,
  ALLOCATION_BANDS,
  UNACCLIMATISED_LIMITS,
  allocateWorkRest,
  waterMlPerHour,
  type HeatStatus,
  type WorkCategory,
  type WorkRestAllocation,
} from './standards';

/** One hour of forecast conditions. `timeIso` is local time, `hourLabel` is what the UI shows. */
export interface ForecastHour {
  timeIso: string;
  hourLabel: string;
  dryBulbC: number;
  relativeHumidity: number;
  windMs: number;
  solarWm2: number;
}

export interface PlannedHour extends WbgtResult {
  hourLabel: string;
  timeIso: string;
  allocation: WorkRestAllocation;
  /** Work minutes permitted in this hour under the applicable standard. */
  workMinutes: number;
  restMinutes: number;
  waterMl: number;
  status: HeatStatus;
  /** True when this hour is above the category's continuous-work limit. */
  aboveContinuousLimit: boolean;
  /** WBGT minus the continuous-work limit; positive means over the limit. */
  exceedanceC: number;
}

export interface ShiftPlan {
  hours: PlannedHour[];
  category: WorkCategory;
  acclimatised: boolean;
  /** Continuous-work limit for this category/acclimatisation, degrees C. */
  continuousLimitC: number;
  /** Sum of permitted work minutes across the plan. */
  permittedWorkMinutes: number;
  /** Minutes in the plan where work must stop entirely. */
  stopMinutes: number;
  /** Total exceedance (degree-minutes above the continuous limit). */
  exceedanceDegreeMinutes: number;
  peakWbgtC: number;
  totalWaterLitres: number;
}

export interface ShiftWindowCandidate {
  startIndex: number;
  endIndexExclusive: number;
  startLabel: string;
  endLabel: string;
  exceedanceDegreeMinutes: number;
  permittedWorkMinutes: number;
  exposureMinutes: number;
  peakWbgtC: number;
}

export interface ShiftWindowResult {
  /** The best window found, or null if the horizon cannot fit the requested shift length. */
  best: ShiftWindowCandidate | null;
  /** A naive 09:00-17:00 baseline, for the side-by-side the user sees. */
  naive: ShiftWindowCandidate | null;
  /** All candidates considered, in chronological order. */
  candidates: ShiftWindowCandidate[];
  shiftLengthHours: number;
}

export function planShift(
  hours: readonly ForecastHour[],
  category: WorkCategory,
  acclimatised: boolean,
): ShiftPlan {
  const limit = continuousLimit(category, acclimatised);
  const planned: PlannedHour[] = hours.map((hour) => {
    const wbgt = computeWbgt(toWbgtInput(hour));
    const allocation = allocateWorkRest(wbgt.wbgtC, category, acclimatised);
    return {
      ...wbgt,
      timeIso: hour.timeIso,
      hourLabel: hour.hourLabel,
      allocation,
      workMinutes: allocation.workMinutesPerHour,
      restMinutes: allocation.restMinutesPerHour,
      waterMl: waterMlPerHour(wbgt.wbgtC, category),
      status: allocation.status,
      aboveContinuousLimit: wbgt.wbgtC > limit,
      exceedanceC: round1(wbgt.wbgtC - limit),
    };
  });

  const peakWbgtC = planned.reduce((max, hour) => Math.max(max, hour.wbgtC), 0);
  const permittedWorkMinutes = planned.reduce((sum, hour) => sum + hour.workMinutes, 0);
  const stopMinutes = planned
    .filter((hour) => hour.allocation.mustStopWork)
    .reduce((sum, _hour) => sum + 60, 0);
  const exceedanceDegreeMinutes = round1(
    planned.reduce((sum, hour) => sum + Math.max(0, hour.exceedanceC) * 60, 0),
  );
  const totalWaterLitres = round1(planned.reduce((sum, hour) => sum + hour.waterMl, 0) / 1000);

  return {
    hours: planned,
    category,
    acclimatised,
    continuousLimitC: limit,
    permittedWorkMinutes,
    stopMinutes,
    exceedanceDegreeMinutes,
    peakWbgtC: round1(peakWbgtC),
    totalWaterLitres,
  };
}

export interface ShiftWindowOptions {
  /** Earliest hour of the day a shift may start (24h clock). Default 05:00. */
  earliestStartHour?: number;
  /** Latest hour of the day a shift may start (24h clock). Default 14:00. */
  latestStartHour?: number;
}

/**
 * Search candidate start times for a shift of `shiftLengthHours` and score each by heat
 * exposure. Ranking, in order:
 *
 *   1. exposure minutes      — hours in which the crew cannot work unrestricted at all
 *   2. exceedance degree-minutes — how far above the limit those hours are
 *   3. peak WBGT             — worst single hour in the window
 *   4. earlier start         — the practical lever a supervisor actually has
 *
 * Candidate start times are bounded by daylight/plausible shift hours (05:00-14:00 by
 * default). Night work is a real mitigation but is out of scope for this build, and it is
 * disclosed as such rather than silently "recommended" by an unconstrained search.
 */
export function optimiseShiftWindow(
  hours: readonly ForecastHour[],
  category: WorkCategory,
  acclimatised: boolean,
  shiftLengthHours: number,
  options: ShiftWindowOptions = {},
): ShiftWindowResult {
  const earliest = options.earliestStartHour ?? 5;
  const latest = options.latestStartHour ?? 14;
  const limit = continuousLimit(category, acclimatised);
  const candidates: ShiftWindowCandidate[] = [];
  const maxStart = hours.length - shiftLengthHours;

  for (let start = 0; start <= maxStart; start += 1) {
    const hour = hours[start];
    if (!hour) continue;
    const startHour = parseHourLabel(hour.hourLabel);
    if (startHour === null || startHour < earliest || startHour > latest) continue;
    candidates.push(scoreWindow(hours, start, shiftLengthHours, category, acclimatised, limit));
  }

  const naiveStart = hours.findIndex((hour) => hour.hourLabel.startsWith('09:'));
  const naive = naiveStart >= 0 && naiveStart <= maxStart
    ? candidates.find((candidate) => candidate.startIndex === naiveStart) ?? null
    : null;

  const best = candidates.length
    ? [...candidates].sort(compareCandidates)[0] ?? null
    : null;

  return { best, naive, candidates, shiftLengthHours };
}

function scoreWindow(
  hours: readonly ForecastHour[],
  start: number,
  length: number,
  category: WorkCategory,
  acclimatised: boolean,
  limit: number,
): ShiftWindowCandidate {
  let exceedanceDegreeMinutes = 0;
  let permittedWorkMinutes = 0;
  let exposureMinutes = 0;
  let peakWbgtC = 0;

  for (let i = start; i < start + length; i += 1) {
    const hour = hours[i];
    if (!hour) continue;
    const wbgt = computeWbgt(toWbgtInput(hour));
    const allocation = allocateWorkRest(wbgt.wbgtC, category, acclimatised);
    peakWbgtC = Math.max(peakWbgtC, wbgt.wbgtC);
    permittedWorkMinutes += allocation.workMinutesPerHour;
    if (wbgt.wbgtC > limit) {
      exceedanceDegreeMinutes += (wbgt.wbgtC - limit) * 60;
      exposureMinutes += 60;
    }
  }

  const first = hours[start];
  const last = hours[start + length - 1];
  return {
    startIndex: start,
    endIndexExclusive: start + length,
    startLabel: first ? first.hourLabel : '',
    endLabel: last ? endHourLabel(last.hourLabel) : '',
    exceedanceDegreeMinutes: round1(exceedanceDegreeMinutes),
    permittedWorkMinutes,
    exposureMinutes,
    peakWbgtC: round1(peakWbgtC),
  };
}

function compareCandidates(a: ShiftWindowCandidate, b: ShiftWindowCandidate): number {
  if (a.exposureMinutes !== b.exposureMinutes) return a.exposureMinutes - b.exposureMinutes;
  if (a.exceedanceDegreeMinutes !== b.exceedanceDegreeMinutes) {
    return a.exceedanceDegreeMinutes - b.exceedanceDegreeMinutes;
  }
  if (a.peakWbgtC !== b.peakWbgtC) return a.peakWbgtC - b.peakWbgtC;
  return a.startIndex - b.startIndex;
}

/**
 * The lowest WBGT at which the standard starts requiring a work/rest restriction for this
 * category. For rest, light and moderate work that is exactly the continuous-work (75-100%)
 * limit. For heavy and very heavy work — where the standard publishes no continuous limit at
 * all — it is the first allocation band that does publish one, i.e. the point at which
 * restricting the crew becomes mandatory rather than optional.
 */
export function continuousLimit(category: WorkCategory, acclimatised: boolean): number {
  const table = acclimatised ? ACCLIMATISED_LIMITS : UNACCLIMATISED_LIMITS;
  for (const band of ALLOCATION_BANDS) {
    const limit = table[band.label]?.[category];
    if (typeof limit === 'number') return limit;
  }
  return acclimatised ? ABSOLUTE_STOP_WBGT_C : 30.0;
}

function parseHourLabel(hourLabel: string): number | null {
  const [hh] = hourLabel.split(':');
  if (hh === undefined) return null;
  const hour = Number.parseInt(hh, 10);
  return Number.isFinite(hour) ? hour : null;
}

function endHourLabel(startLabel: string): string {
  const hour = parseHourLabel(startLabel);
  const end = hour === null ? 0 : (hour + 1) % 24;
  return `${String(end).padStart(2, '0')}:00`;
}

function toWbgtInput(hour: ForecastHour): WbgtInput {
  return {
    dryBulbC: hour.dryBulbC,
    relativeHumidity: hour.relativeHumidity,
    windMs: hour.windMs,
    solarWm2: hour.solarWm2,
  };
}
