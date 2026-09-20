/**
 * Heat-stress standards tables and lookups — ShramShield.
 *
 * Sources, stated precisely because a provenance claim that mixes two documents is worse than
 * no provenance claim at all:
 *
 *  1. The four work-allocation bands (light / moderate / heavy / very heavy) are the ACGIH TLV
 *     screening criteria for heat stress exposure, reproduced verbatim from the BC Government /
 *     WorkSafeBC "Hot Environments - Control Measures" fact sheet, Table 1 (adapted from
 *     2016 TLVs and BEIs, ACGIH, p. 218).
 *  2. The `rest` column (32.5 C acclimatised / 30.0 C unacclimatised, flat across every band)
 *     is NOT in that table — it comes from ACGIH's resting-metabolic-rate screening values as
 *     published in secondary heat-stress references. It is marked as such below rather than
 *     presented as part of the verbatim table.
 *
 * Values are WBGT in degrees C for an 8-hour work day, 5-day week, conventional breaks,
 * standard work clothing, by metabolic-rate category and by the allocation of work in the
 * work/rest cycle. A second set of (lower) values applies to unacclimatised workers.
 *
 * Limits are asserted in standards.test.ts so the transcription cannot drift.
 */

export type WorkCategory = 'rest' | 'light' | 'moderate' | 'heavy' | 'veryHeavy';

export interface WorkCategoryMeta {
  id: WorkCategory;
  label: string;
  /** Representative metabolic rate in watts (ACGIH categories). */
  metabolicRateW: number;
  examples: string;
}

export const WORK_CATEGORIES: readonly WorkCategoryMeta[] = [
  {
    id: 'rest',
    label: 'Rest / sitting',
    metabolicRateW: 115,
    examples: 'Sitting, light hand work, supervising',
  },
  {
    id: 'light',
    label: 'Light work',
    metabolicRateW: 180,
    examples: 'Standing, light filing, driving, inspecting, walking slowly',
  },
  {
    id: 'moderate',
    label: 'Moderate work',
    metabolicRateW: 300,
    examples: 'Bricklaying, plastering, carrying light loads, scrubbing',
  },
  {
    id: 'heavy',
    label: 'Heavy work',
    metabolicRateW: 415,
    examples: 'Pick and shovel, digging, carrying heavy loads, fast walking',
  },
  {
    id: 'veryHeavy',
    label: 'Very heavy work',
    metabolicRateW: 520,
    examples: 'Shovelling wet sand, intense activity at maximum pace',
  },
] as const;

/**
 * Work/rest allocation bands. `workFraction` is the share of a 60-minute cycle spent working,
 * expressed as the midpoint of the band the ACGIH table is keyed on. `null` means the ACGIH
 * table publishes no exposure limit for that band/category combination.
 */
export interface AllocationBand {
  workFraction: number;
  label: string;
}

export const ALLOCATION_BANDS: readonly AllocationBand[] = [
  { workFraction: 0.875, label: '75-100% work' },
  { workFraction: 0.625, label: '50-75% work' },
  { workFraction: 0.375, label: '25-50% work' },
  { workFraction: 0.125, label: '0-25% work' },
] as const;

/**
 * Acclimatised worker TLV screening values (WBGT degrees C). Rows: band. Columns: category.
 * The `rest` entries are the secondary-source resting values described in the file header; the
 * other columns are the verbatim WorkSafeBC/ACGIH table.
 */
export const ACCLIMATISED_LIMITS: Record<string, Record<WorkCategory, number | null>> = {
  '75-100% work': { rest: 32.5, light: 31.0, moderate: 28.0, heavy: null, veryHeavy: null },
  '50-75% work': { rest: 32.5, light: 31.0, moderate: 29.0, heavy: 27.5, veryHeavy: null },
  '25-50% work': { rest: 32.5, light: 32.0, moderate: 30.0, heavy: 29.0, veryHeavy: 28.0 },
  '0-25% work': { rest: 32.5, light: 32.5, moderate: 31.5, heavy: 30.5, veryHeavy: 30.0 },
};

/** Unacclimatised worker action limits (WBGT degrees C). Rows: band. Columns: category.
 * The `rest` entries are the secondary-source resting values described in the file header. */
export const UNACCLIMATISED_LIMITS: Record<string, Record<WorkCategory, number | null>> = {
  '75-100% work': { rest: 30.0, light: 28.0, moderate: 25.0, heavy: null, veryHeavy: null },
  '50-75% work': { rest: 30.0, light: 28.5, moderate: 26.0, heavy: 24.0, veryHeavy: null },
  '25-50% work': { rest: 30.0, light: 29.5, moderate: 27.0, heavy: 25.5, veryHeavy: 24.5 },
  '0-25% work': { rest: 30.0, light: 30.0, moderate: 29.0, heavy: 28.0, veryHeavy: 27.0 },
};

/** Above this WBGT no outdoor work of any intensity is defensible under the ACGIH scheme. */
export const ABSOLUTE_STOP_WBGT_C = 32.5;

export type HeatStatus = 'continuous' | 'caution' | 'high' | 'extreme' | 'stop';

export interface WorkRestAllocation {
  /** Share of each 60-minute cycle that may be spent working (0 when work must stop). */
  workFraction: number;
  /** Minutes of work per hour. */
  workMinutesPerHour: number;
  /** Minutes of rest per hour. */
  restMinutesPerHour: number;
  /** The band label the decision came from. */
  band: string;
  /** The WBGT limit that band was compared against, degrees C. */
  limitC: number;
  status: HeatStatus;
  /** True when even the 0-25% work band is exceeded. */
  mustStopWork: boolean;
}

/**
 * Pick the work/rest allocation for a WBGT reading, category and acclimatisation state.
 * The most permissive band whose limit is not exceeded wins; if even the least permissive
 * band is exceeded, work stops.
 */
export function allocateWorkRest(
  wbgtC: number,
  category: WorkCategory,
  acclimatised: boolean,
): WorkRestAllocation {
  const table = acclimatised ? ACCLIMATISED_LIMITS : UNACCLIMATISED_LIMITS;
  const ceiling = acclimatised ? ABSOLUTE_STOP_WBGT_C : 30.0;

  for (const band of ALLOCATION_BANDS) {
    const limit = table[band.label]?.[category];
    if (limit === null || limit === undefined) continue;
    if (wbgtC <= limit) {
      const workMinutes = Math.round(band.workFraction * 60);
      return {
        workFraction: band.workFraction,
        workMinutesPerHour: workMinutes,
        restMinutesPerHour: 60 - workMinutes,
        band: band.label,
        limitC: limit,
        status: statusFor(workMinutes),
        mustStopWork: false,
      };
    }
  }

  return {
    workFraction: 0,
    workMinutesPerHour: 0,
    restMinutesPerHour: 60,
    band: 'above all published limits',
    limitC: ceiling,
    status: 'stop',
    mustStopWork: true,
  };
}

function statusFor(workMinutesPerHour: number): HeatStatus {
  if (workMinutesPerHour >= 60) return 'continuous';
  if (workMinutesPerHour >= 30) return 'caution';
  if (workMinutesPerHour >= 15) return 'high';
  return 'extreme';
}

/**
 * Drinking-water guidance. Basis: OSHA's Water.Rest.Shade campaign recommends about one cup
 * (250 ml) every 20 minutes for moderate work in heat (750 ml/h); ACGIH guidance scales fluid
 * replacement with metabolic rate and heat load. We scale that baseline by metabolic category
 * and add a WBGT term, then cap it — the number is guidance, not a prescription.
 */
export function waterMlPerHour(wbgtC: number, category: WorkCategory): number {
  const meta = WORK_CATEGORIES.find((c) => c.id === category);
  const metabolicFactor = meta ? meta.metabolicRateW / 300 : 1;
  const base = 750 * metabolicFactor;
  const heatTerm = Math.max(0, wbgtC - 25) * 30;
  const raw = base + heatTerm;
  return Math.round(clamp(raw, 250, 1200) / 50) * 50;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
