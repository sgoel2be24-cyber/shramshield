import { describe, expect, it } from 'vitest';
import { DEFAULT_PLAN, isCustomPlan, planFromSearch, planToSearch } from './share';

describe('planFromSearch', () => {
  it('returns the default plan for an empty query', () => {
    expect(planFromSearch('')).toEqual(DEFAULT_PLAN);
    expect(planFromSearch('?')).toEqual(DEFAULT_PLAN);
  });

  it('round-trips a custom plan through the URL', () => {
    const plan = { slug: 'hot-delhi', category: 'veryHeavy' as const, acclimatised: false, shiftLength: 9 };
    expect(planFromSearch(planToSearch(plan))).toEqual(plan);
  });

  it('rejects unknown values field by field rather than throwing', () => {
    const plan = planFromSearch('?city=not-a-city&cat=rocketScience&accl=maybe&shift=99');
    expect(plan).toEqual(DEFAULT_PLAN);
  });

  it('keeps valid fields and drops invalid ones in a mixed query', () => {
    const plan = planFromSearch('?city=jaisalmer&cat=heavy&accl=0&shift=abc');
    expect(plan.slug).toBe('jaisalmer');
    expect(plan.category).toBe('heavy');
    expect(plan.acclimatised).toBe(false);
    expect(plan.shiftLength).toBe(DEFAULT_PLAN.shiftLength);
  });
});

describe('planToSearch / isCustomPlan', () => {
  it('produces a stable query string for identical states', () => {
    const plan = { slug: 'chennai', category: 'light' as const, acclimatised: true, shiftLength: 6 };
    expect(planToSearch(plan)).toBe(planToSearch(plan));
  });

  it('marks only non-default plans as custom', () => {
    expect(isCustomPlan(DEFAULT_PLAN)).toBe(false);
    expect(isCustomPlan({ ...DEFAULT_PLAN, shiftLength: 9 })).toBe(true);
  });
});
