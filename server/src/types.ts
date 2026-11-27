export type CategoryId =
  | "roads"
  | "waste"
  | "water"
  | "drainage"
  | "electricity"
  | "infrastructure"
  | "environment"
  | "health"
  | "safety"
  | "gov_services"
  | "corruption"
  | "education"
  | "other"
  | "garbage"
  | "streetlights";

export type StatusId = "submitted" | "review" | "progress" | "resolved";
export type PriorityId = "low" | "medium" | "high" | "critical";

export interface PriorityFactors {
  severity: number;
  impact: number;
  recurrence: number;
  urgency: number;
}

export const CATEGORY_IDS: CategoryId[] = [
  "roads",
  "waste",
  "water",
  "drainage",
  "electricity",
  "infrastructure",
  "environment",
  "health",
  "safety",
  "gov_services",
  "corruption",
  "education",
  "other",
];

export const STATUS_IDS: StatusId[] = ["submitted", "review", "progress", "resolved"];
export const PRIORITY_IDS: PriorityId[] = ["low", "medium", "high", "critical"];

export function canonicalCategory(value: string): CategoryId {
  if (value === "garbage") return "waste";
  if (value === "streetlights") return "electricity";
  return (CATEGORY_IDS as string[]).includes(value) ? (value as CategoryId) : "other";
}
