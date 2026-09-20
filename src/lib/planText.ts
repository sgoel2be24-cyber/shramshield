/**
 * Plain-text shift plan — the artifact a supervisor can actually hand on (a WhatsApp message,
 * a printed sheet on the site office wall). Kept as a pure function so it can be tested and so
 * the numbers in it come from the same engine as the screen.
 *
 * Available in English and Hindi. This is the one part of the tool that leaves the screen and
 * reaches the crew, and over 90% of India's outdoor workforce is informal — a stop-work
 * instruction is worth nothing to someone who cannot read it. The rest of the UI is English
 * because a supervisor operates it; this text is for the people the plan is about.
 *
 * Numbers, clock times and the standards' own names (WBGT, ISO 7243, ACGIH) are left as they are
 * in both languages: they are read off the same sheet by both audiences, and transliterating a
 * standard's name would make it harder to look up, not easier.
 */

import type { ShiftPlan, ShiftWindowResult } from './plan';
import type { WorkCategory } from './standards';

export type PlanTextLanguage = 'en' | 'hi';

export interface PlanTextMeta {
  locationName: string;
  dataLabel: string;
  /** The category id, so the Hindi sheet can name the work rate in Hindi. */
  category: WorkCategory;
  /** The English label, used as-is on the English sheet. */
  categoryLabel: string;
  acclimatised: boolean;
}

const CATEGORY_HI: Record<WorkCategory, string> = {
  rest: 'आराम / बैठकर काम',
  light: 'हल्का काम',
  moderate: 'मध्यम काम',
  heavy: 'भारी काम',
  veryHeavy: 'बहुत भारी काम',
};

interface Copy {
  title: string;
  crew: (category: string, acclimatised: boolean) => string;
  recommended: (start: string, end: string) => string;
  recommendedUnavailable: string;
  comparison: (naiveMinutes: number, bestMinutes: number) => string;
  permitted: (duration: string) => string;
  peak: (peak: string, limit: string) => string;
  stopHours: (hours: string) => string;
  noStopHours: string;
  hourHeading: string;
  hourRow: (label: string, wbgt: string, work: number, rest: number, waterMl: number, stop: boolean) => string;
  water: (litres: number) => string;
  method: string;
  disclaimer: string;
  duration: (totalMinutes: number) => string;
}

const COPY: Record<PlanTextLanguage, Copy> = {
  en: {
    title: 'ShramShield — heat-safety shift plan',
    crew: (category, acclimatised) =>
      `Work rate: ${category} · crew: ${acclimatised ? 'acclimatised' : 'new / returning worker'}`,
    recommended: (start, end) => `RECOMMENDED SHIFT: ${start} – ${end}`,
    recommendedUnavailable: 'RECOMMENDED SHIFT: could not be computed from this data.',
    comparison: (naiveMinutes, bestMinutes) =>
      `Default 09:00 rota would spend ${naiveMinutes} min above the safe limit; this window spends ${bestMinutes} min.`,
    permitted: (duration) => `Work permitted in the window: ${duration}`,
    peak: (peak, limit) => `Peak WBGT ${peak} C vs ${limit} C limit for this work rate.`,
    stopHours: (hours) => `STOP WORK in these hours: ${hours}`,
    noStopHours: 'No hours require a full stop of work.',
    hourHeading: 'HOUR BY HOUR (work / rest per hour, drinking water)',
    hourRow: (label, wbgt, work, rest, waterMl, stop) =>
      `  ${label}  WBGT ${wbgt} C  ${work} min work / ${rest} min rest  ${waterMl} ml${stop ? '  <- STOP WORK' : ''}`,
    water: (litres) => `Water for the shift: ${litres} L per worker.`,
    method:
      'Method: WBGT (ISO 7243) from the forecast; work/rest limits from the ACGIH TLV screening table.',
    disclaimer:
      'Globe and wet-bulb terms are modelled, not measured. Advisory only — not medical advice.',
    duration: (total) => `${Math.floor(total / 60)} h ${total % 60} m`,
  },
  hi: {
    title: 'ShramShield — गर्मी से बचाव की शिफ्ट योजना',
    crew: (category, acclimatised) =>
      `काम का प्रकार: ${category} · कर्मचारी: ${acclimatised ? 'गर्मी के अभ्यस्त' : 'नया / लौटकर आया'}`,
    recommended: (start, end) => `सुझाई गई शिफ्ट: ${start} – ${end}`,
    recommendedUnavailable: 'सुझाई गई शिफ्ट: इस डेटा से तय नहीं हो सकी।',
    comparison: (naiveMinutes, bestMinutes) =>
      `सामान्य 09:00 वाली शिफ्ट में ${naiveMinutes} मिनट सुरक्षित सीमा से ऊपर बीतते; इस शिफ्ट में ${bestMinutes} मिनट।`,
    permitted: (duration) => `इस शिफ्ट में काम की अनुमति: ${duration}`,
    peak: (peak, limit) => `अधिकतम WBGT ${peak} C, इस काम के लिए सीमा ${limit} C।`,
    stopHours: (hours) => `इन घंटों में काम पूरी तरह बंद रखें: ${hours}`,
    noStopHours: 'किसी घंटे में काम पूरी तरह बंद करने की ज़रूरत नहीं।',
    hourHeading: 'घंटे के हिसाब से (हर घंटे काम / आराम, पीने का पानी)',
    hourRow: (label, wbgt, work, rest, waterMl, stop) =>
      `  ${label}  WBGT ${wbgt} C  ${work} मिनट काम / ${rest} मिनट आराम  ${waterMl} मि.ली.${stop ? '  <- काम बंद' : ''}`,
    water: (litres) => `शिफ्ट के लिए पानी: ${litres} लीटर प्रति कर्मचारी।`,
    method:
      'विधि: मौसम पूर्वानुमान से WBGT (ISO 7243); काम/आराम की सीमाएँ ACGIH TLV तालिका से।',
    disclaimer:
      'ग्लोब और वेट-बल्ब मान अनुमानित हैं, मापे नहीं गए। यह केवल सलाह है — चिकित्सा सलाह नहीं।',
    // घंटा is singular, घंटे plural — "1 घंटे" is the kind of slip that tells a reader the sheet
    // was translated by someone who does not speak the language.
    duration: (total) => {
      const hours = Math.floor(total / 60);
      return `${hours} ${hours === 1 ? 'घंटा' : 'घंटे'} ${total % 60} मिनट`;
    },
  },
};

export function planToText(
  plan: ShiftPlan,
  shiftWindow: ShiftWindowResult,
  meta: PlanTextMeta,
  language: PlanTextLanguage = 'en',
): string {
  const copy = COPY[language];
  const categoryLabel = language === 'hi' ? CATEGORY_HI[meta.category] : meta.categoryLabel;
  const best = shiftWindow.best;
  const naive = shiftWindow.naive;
  const lines: string[] = [];

  lines.push(copy.title);
  lines.push(`${meta.locationName} · ${meta.dataLabel}`);
  lines.push(copy.crew(categoryLabel, meta.acclimatised));
  lines.push('');

  if (best) {
    lines.push(copy.recommended(best.startLabel, best.endLabel));
    if (naive && naive.startIndex !== best.startIndex) {
      lines.push(copy.comparison(naive.exposureMinutes, best.exposureMinutes));
    }
    lines.push(copy.permitted(copy.duration(best.permittedWorkMinutes)));
  } else {
    lines.push(copy.recommendedUnavailable);
  }
  lines.push('');

  lines.push(copy.peak(plan.peakWbgtC.toFixed(1), plan.continuousLimitC.toFixed(1)));
  const stopHours = plan.hours.filter((hour) => hour.allocation.mustStopWork);
  lines.push(
    stopHours.length > 0
      ? copy.stopHours(stopHours.map((hour) => hour.hourLabel).join(', '))
      : copy.noStopHours,
  );
  lines.push('');

  lines.push(copy.hourHeading);
  for (const hour of plan.hours) {
    lines.push(
      copy.hourRow(
        hour.hourLabel,
        hour.wbgtC.toFixed(1),
        hour.workMinutes,
        hour.restMinutes,
        hour.waterMl,
        hour.allocation.mustStopWork,
      ),
    );
  }
  lines.push('');

  if (best) {
    const shiftHours = plan.hours.slice(best.startIndex, best.endIndexExclusive);
    const litres = Math.round((shiftHours.reduce((sum, hour) => sum + hour.waterMl, 0) / 1000) * 10) / 10;
    lines.push(copy.water(litres));
  }
  lines.push('');
  lines.push(copy.method);
  lines.push(copy.disclaimer);

  return lines.join('\n');
}
