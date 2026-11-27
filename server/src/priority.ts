import type { PriorityFactors, PriorityId } from "./types.js";

export const PRIORITY_WEIGHTS = {
  severity: 0.35,
  impact: 0.25,
  recurrence: 0.2,
  urgency: 0.2,
} as const;

/** Transparent, rule-based priority model. No machine learning is involved. */
export function scoreFromFactors(factors: PriorityFactors): number {
  return Math.round(
    factors.severity * PRIORITY_WEIGHTS.severity +
      factors.impact * PRIORITY_WEIGHTS.impact +
      factors.recurrence * PRIORITY_WEIGHTS.recurrence +
      factors.urgency * PRIORITY_WEIGHTS.urgency
  );
}

export function priorityFromScore(score: number): PriorityId {
  if (score >= 80) return "critical";
  if (score >= 65) return "high";
  if (score >= 45) return "medium";
  return "low";
}

const BASE_FACTORS: Record<string, PriorityFactors> = {
  low: { severity: 30, impact: 34, recurrence: 28, urgency: 26 },
  medium: { severity: 55, impact: 58, recurrence: 50, urgency: 48 },
  high: { severity: 74, impact: 76, recurrence: 64, urgency: 66 },
  critical: { severity: 92, impact: 88, recurrence: 72, urgency: 90 },
};

/**
 * Converts a citizen's severity choice into the four scoring factors.
 * Public impact and urgency rise for sensitive categories, so the weights stay meaningful.
 */
export function factorsForSeverity(severity: string, category: string): PriorityFactors {
  const base = { ...(BASE_FACTORS[severity] ?? BASE_FACTORS.medium) };
  const sensitive = ["safety", "health", "drainage", "electricity", "water", "corruption"];
  if (sensitive.includes(category)) {
    base.impact = Math.min(100, base.impact + 6);
    base.urgency = Math.min(100, base.urgency + 4);
  }
  return base;
}

export function explainScore(factors: PriorityFactors, score: number, priority: PriorityId): string[] {
  return [
    `Rule-based score ${score}/100 from severity ${factors.severity}, public impact ${factors.impact}, recurrence ${factors.recurrence} and urgency ${factors.urgency}.`,
    `Weighting: severity 35%, public impact 25%, recurrence 20%, urgency 20%.`,
    `Resulting priority band: ${priority}.`,
  ];
}
