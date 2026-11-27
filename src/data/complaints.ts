import type { Complaint, PriorityFactors, PriorityId, StatusId, TimelineEvent } from "@/types";
import { addDays } from "@/lib/utils";

/**
 * Priority is a transparent, rule-based model (no machine learning):
 * severity 35%, public impact 25%, recurrence 20%, urgency 20%.
 * The same weighting is applied server-side when a complaint is created.
 */
const STATUS_ORDER: StatusId[] = ["submitted", "review", "progress", "resolved"];

const STEP_META: Record<StatusId, { label: string; note: string }> = {
  submitted: {
    label: "Report received",
    note: "Complaint logged and acknowledgement sent to the reporter.",
  },
  review: {
    label: "Under review",
    note: "Ward officer validating details and assigning a field team.",
  },
  progress: {
    label: "Work in progress",
    note: "Field crew dispatched. Repair work is underway at the location.",
  },
  resolved: {
    label: "Resolved",
    note: "Work verified on site and the complaint has been closed.",
  },
};

export function scoreFromFactors(factors: PriorityFactors) {
  return Math.round(
    factors.severity * 0.35 +
      factors.impact * 0.25 +
      factors.recurrence * 0.2 +
      factors.urgency * 0.2
  );
}

export function priorityFromScore(score: number): PriorityId {
  if (score >= 80) return "critical";
  if (score >= 65) return "high";
  if (score >= 45) return "medium";
  return "low";
}

export function buildTimeline(
  date: string,
  status: StatusId,
  resolutionNote?: string
): TimelineEvent[] {
  const index = STATUS_ORDER.indexOf(status);
  return STATUS_ORDER.map((step, i) => ({
    status: step,
    label: STEP_META[step].label,
    date: addDays(date, [0, 1, 3, 6][i]),
    note: step === "resolved" && resolutionNote ? resolutionNote : STEP_META[step].note,
    done: i <= index,
    current: i === index,
  }));
}

export function advanceComplaint(
  complaint: Complaint,
  status: StatusId,
  resolutionNote?: string
): Complaint {
  const note = resolutionNote ?? complaint.resolutionNote;
  const timeline = buildTimeline(complaint.date, status, note);
  const lastDone = [...timeline].reverse().find((event) => event.done);
  return {
    ...complaint,
    status,
    timeline,
    resolutionNote: note,
    updated: lastDone?.date ?? complaint.updated,
  };
}

export const SEVERITY_FACTORS: Record<string, PriorityFactors> = {
  low: { severity: 30, impact: 34, recurrence: 28, urgency: 26 },
  medium: { severity: 55, impact: 58, recurrence: 50, urgency: 48 },
  high: { severity: 74, impact: 76, recurrence: 64, urgency: 66 },
  critical: { severity: 92, impact: 88, recurrence: 72, urgency: 90 },
};
