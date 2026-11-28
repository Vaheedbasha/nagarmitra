export type CategoryId =
  | "roads"
  | "waste"
  | "garbage"
  | "water"
  | "drainage"
  | "electricity"
  | "streetlights"
  | "infrastructure"
  | "environment"
  | "health"
  | "safety"
  | "gov_services"
  | "corruption"
  | "education"
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

/**
 * Aggregate reporter information only. The API never returns a reporter's
 * name, phone, email or user id for a complaint.
 */
export interface Reporter {
  anonymous: boolean;
  reports: number;
  trust: number;
}

export interface Comment {
  id: string;
  author: string;
  avatar?: string;
  date: string;
  text: string;
  badge?: string;
}

export interface MediaRef {
  id: string;
  kind: "photo" | "video" | "audio";
  url: string;
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  aiSummary: string;
  aiSource?: string;
  category: CategoryId;
  status: StatusId;
  priority: PriorityId;
  score: number;
  factors: PriorityFactors;
  city?: string;
  location: string;
  area: string;
  ward?: string;
  date: string;
  updated: string;
  photo?: string;
  video?: string;
  media?: MediaRef[];
  audio?: string;
  reporter: Reporter;
  reporterId?: string;
  lat: number;
  lng: number;
  upvotes: number;
  confirmedByMe?: boolean;
  why: string[];
  timeline: TimelineEvent[];
  resolutionNote?: string;
  comments?: Comment[];
  aiEdited?: boolean;
  aiEditedAt?: string;
  escalatedTo?: string;
  escalationSla?: string;
  escalationNote?: string;
  assignedDepartment?: string;
  assignedOfficial?: string;
  assignedAt?: string;
  slaDue?: string;
  isDemo?: boolean;
  isMine?: boolean;
  /** Legacy demo field retained so the original seed module still type-checks. */
  coordinates?: { x: number; y: number };
}

export interface ComplaintStats {
  total: number;
  resolved: number;
  inProgress: number;
  highPriority: number;
  submitted: number;
  confirmations: number;
}

export interface CreateComplaintInput {
  title: string;
  description: string;
  category: CategoryId;
  severity: "low" | "medium" | "high" | "critical";
  location: string;
  area?: string;
  ward?: string;
  city: string;
  lat: number;
  lng: number;
  aiSummary?: string;
  aiSource?: string;
  mediaIds?: string[];
}

export type VerificationDecision = "approved" | "field_check" | "rejected";

export type UserRole = "citizen" | "official" | "admin";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  officialStatus: string | null;
  department: string | null;
  designation: string | null;
  ward: string | null;
  organisation: string | null;
  city: string | null;
  area: string | null;
  language: "en" | "hi" | "te";
  notifyEmail: boolean;
  emailVerified?: boolean;
  trustScore: number;
  createdAt: string;
}
