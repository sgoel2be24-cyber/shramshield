/**
 * Plain-text shift plan — the artifact a supervisor can actually hand on (a WhatsApp message,
 * a printed sheet on the site office wall). Kept as a pure function so it can be tested and so
 * the numbers in it come from the same engine as the screen.
 */

import type { ShiftPlan, ShiftWindowResult } from './plan';

export interface PlanTextMeta {
  locationName: string;
  dataLabel: string;
  categoryLabel: string;
  acclimatised: boolean;
}

export function planToText(plan: ShiftPlan, window: ShiftWindowResult, meta: PlanTextMeta): string {
  const best = window.best;
  const naive = window.naive;
  const lines: string[] = [];

  lines.push('ShramShield — heat-safety shift plan');
  lines.push(`${meta.locationName} · ${meta.dataLabel}`);
  lines.push(
    `Work rate: ${meta.categoryLabel} · crew: ${meta.acclimatised ? 'acclimatised' : 'new / returning worker'}`,
  );
  lines.push('');

  if (best) {
    lines.push(`RECOMMENDED SHIFT: ${best.startLabel} – ${best.endLabel}`);
    if (naive && naive.startIndex !== best.startIndex) {
      lines.push(
        `Default 09:00 rota would spend ${naive.exposureMinutes} min above the safe limit; this window spends ${best.exposureMinutes} min.`,
      );
    }
    lines.push(`Work permitted in the window: ${minutes(best.permittedWorkMinutes)}`);
  } else {
    lines.push('RECOMMENDED SHIFT: could not be computed from this data.');
  }
  lines.push('');

  lines.push(`Peak WBGT ${plan.peakWbgtC.toFixed(1)} C vs ${plan.continuousLimitC.toFixed(1)} C limit for this work rate.`);
  const stopHours = plan.hours.filter((hour) => hour.allocation.mustStopWork);
  lines.push(
    stopHours.length > 0
      ? `STOP WORK in these hours: ${stopHours.map((hour) => hour.hourLabel).join(', ')}`
      : 'No hours require a full stop of work.',
  );
  lines.push('');

  lines.push('HOUR BY HOUR (work / rest per hour, drinking water)');
  for (const hour of plan.hours) {
    const marker = hour.allocation.mustStopWork ? '  <- STOP WORK' : '';
    lines.push(
      `  ${hour.hourLabel}  WBGT ${hour.wbgtC.toFixed(1)} C  ` +
        `${hour.workMinutes} min work / ${hour.restMinutes} min rest  ` +
        `${hour.waterMl} ml${marker}`,
    );
  }
  lines.push('');

  if (best) {
    const shiftHours = plan.hours.slice(best.startIndex, best.endIndexExclusive);
    const litres = Math.round((shiftHours.reduce((sum, hour) => sum + hour.waterMl, 0) / 1000) * 10) / 10;
    lines.push(`Water for the shift: ${litres} L per worker.`);
  }
  lines.push('');
  lines.push('Method: WBGT (ISO 7243) from the forecast; work/rest limits from the ACGIH TLV screening table.');
  lines.push('Globe and wet-bulb terms are modelled, not measured. Advisory only — not medical advice.');

  return lines.join('\n');
}

function minutes(total: number): string {
  return `${Math.floor(total / 60)} h ${total % 60} m`;
}
