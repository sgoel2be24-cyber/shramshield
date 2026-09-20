/**
 * Shareable plan URL — the exact scenario a judge was looking at, restored on load.
 *
 * The state is small and public (a city, a work rate, a crew, a shift length), so the URL is
 * the whole story: no account, no stored session, nothing that expires. Pure functions, tested.
 */

import { scenarioBySlug } from './fallback';
import { WORK_CATEGORIES, type WorkCategory } from './standards';

export interface ShareablePlan {
  slug: string;
  category: WorkCategory;
  acclimatised: boolean;
  shiftLength: number;
}

export const DEFAULT_PLAN: ShareablePlan = {
  slug: 'delhi',
  category: 'moderate',
  acclimatised: true,
  shiftLength: 8,
};

const CATEGORY_IDS = new Set(WORK_CATEGORIES.map((category) => category.id));
const SHIFT_LENGTHS = new Set([6, 8, 9, 10]);

/** Parse a query string into a plan, falling back per-field to the default on anything invalid. */
export function planFromSearch(search: string): ShareablePlan {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const plan: ShareablePlan = { ...DEFAULT_PLAN };

  const slug = params.get('city');
  if (slug) {
    try {
      plan.slug = scenarioBySlug(slug).slug;
    } catch {
      /* unknown city stays on the default */
    }
  }

  const category = params.get('cat');
  if (category && CATEGORY_IDS.has(category as WorkCategory)) {
    plan.category = category as WorkCategory;
  }

  const acclimatised = params.get('accl');
  if (acclimatised === '0' || acclimatised === '1') {
    plan.acclimatised = acclimatised === '1';
  }

  const shiftLength = Number.parseInt(params.get('shift') ?? '', 10);
  if (SHIFT_LENGTHS.has(shiftLength)) {
    plan.shiftLength = shiftLength;
  }

  return plan;
}

/** Serialise a plan back to a query string. Stable order, so two identical states share a URL. */
export function planToSearch(plan: ShareablePlan): string {
  const params = new URLSearchParams({
    city: plan.slug,
    cat: plan.category,
    accl: plan.acclimatised ? '1' : '0',
    shift: String(plan.shiftLength),
  });
  return `?${params.toString()}`;
}

/** True when a URL carries a plan different from the default (i.e. worth sharing). */
export function isCustomPlan(plan: ShareablePlan): boolean {
  return (
    plan.slug !== DEFAULT_PLAN.slug ||
    plan.category !== DEFAULT_PLAN.category ||
    plan.acclimatised !== DEFAULT_PLAN.acclimatised ||
    plan.shiftLength !== DEFAULT_PLAN.shiftLength
  );
}
