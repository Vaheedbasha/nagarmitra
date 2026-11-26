export type CategoryId =
  | "roads"
  | "garbage"
  | "water"
  | "streetlights"
  | "infrastructure"
  | "other";

export type StatusId = "submitted" | "review" | "progress" | "resolved";

export type PriorityId = "low" | "medium" | "high" | "critical";

export interface PriorityFactors {
  severity: number;
  impact: number;
  recurrence: number;
  urgency: number;
}

export interface TimelineEvent {
  status: StatusId;
  label: string;
  date: string;
  note: string;
  done: boolean;
  current: boolean;
}

export interface Reporter {
  name: string;
  anonymous: boolean;
  phone: string;
  reports: number;
  trust: number;
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  aiSummary: string;
  category: CategoryId;
  status: StatusId;
  priority: PriorityId;
  score: number;
  factors: PriorityFactors;
  location: string;
  area: string;
  date: string;
  updated: string;
  photo?: string;
  reporter: Reporter;
  coordinates: { x: number; y: number };
  upvotes: number;
  why: string[];
  timeline: TimelineEvent[];
  resolutionNote?: string;
}
