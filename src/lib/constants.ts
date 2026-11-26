import {
  Construction,
  Droplets,
  Landmark,
  Lightbulb,
  HelpCircle,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import type { CategoryId, PriorityId, StatusId } from "@/types";

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  short: string;
  icon: LucideIcon;
  tile: string;
  tint: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: "roads",
    label: "Roads & Potholes",
    short: "Roads",
    icon: Construction,
    tile: "bg-orange-50 text-orange-600 group-hover:bg-orange-100",
    tint: "bg-orange-50 text-orange-700 border-orange-100",
  },
  {
    id: "garbage",
    label: "Garbage & Sanitation",
    short: "Garbage",
    icon: Trash2,
    tile: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100",
    tint: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  {
    id: "water",
    label: "Water Supply",
    short: "Water",
    icon: Droplets,
    tile: "bg-sky-50 text-sky-600 group-hover:bg-sky-100",
    tint: "bg-sky-50 text-sky-700 border-sky-100",
  },
  {
    id: "streetlights",
    label: "Streetlights",
    short: "Streetlights",
    icon: Lightbulb,
    tile: "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
    tint: "bg-amber-50 text-amber-700 border-amber-100",
  },
  {
    id: "infrastructure",
    label: "Public Infrastructure",
    short: "Infrastructure",
    icon: Landmark,
    tile: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100",
    tint: "bg-indigo-50 text-indigo-700 border-indigo-100",
  },
  {
    id: "other",
    label: "Other Issues",
    short: "Other",
    icon: HelpCircle,
    tile: "bg-slate-100 text-slate-600 group-hover:bg-slate-200",
    tint: "bg-slate-100 text-slate-700 border-slate-200",
  },
];

export function categoryMeta(id: CategoryId) {
  return CATEGORIES.find((category) => category.id === id) ?? CATEGORIES[5];
}

export interface StatusMeta {
  id: StatusId;
  label: string;
  short: string;
  dot: string;
  chip: string;
  soft: string;
}

export const STATUSES: StatusMeta[] = [
  {
    id: "submitted",
    label: "Submitted",
    short: "Submitted",
    dot: "bg-slate-400",
    chip: "bg-slate-50 text-slate-600 border-slate-200",
    soft: "bg-slate-100 text-slate-700",
  },
  {
    id: "review",
    label: "Under Review",
    short: "Review",
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    soft: "bg-amber-100 text-amber-800",
  },
  {
    id: "progress",
    label: "In Progress",
    short: "In Progress",
    dot: "bg-brand-500",
    chip: "bg-brand-50 text-brand-700 border-brand-200",
    soft: "bg-brand-100 text-brand-800",
  },
  {
    id: "resolved",
    label: "Resolved",
    short: "Resolved",
    dot: "bg-accent-500",
    chip: "bg-accent-50 text-accent-700 border-accent-100",
    soft: "bg-accent-100 text-accent-800",
  },
];

export function statusMeta(id: StatusId) {
  return STATUSES.find((status) => status.id === id) ?? STATUSES[0];
}

export interface PriorityMeta {
  id: PriorityId;
  label: string;
  chip: string;
  dot: string;
  marker: string;
  text: string;
}

export const PRIORITIES: PriorityMeta[] = [
  {
    id: "low",
    label: "Low",
    chip: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
    marker: "bg-slate-400",
    text: "text-slate-600",
  },
  {
    id: "medium",
    label: "Medium",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    marker: "bg-amber-500",
    text: "text-amber-700",
  },
  {
    id: "high",
    label: "High",
    chip: "bg-orange-50 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
    marker: "bg-orange-500",
    text: "text-orange-700",
  },
  {
    id: "critical",
    label: "Critical",
    chip: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
    marker: "bg-red-500",
    text: "text-red-600",
  },
];

export function priorityMeta(id: PriorityId) {
  return PRIORITIES.find((priority) => priority.id === id) ?? PRIORITIES[0];
}

/** Sample priority model — deliberately transparent and mock-only. */
export const PRIORITY_WEIGHTS = [
  { id: "severity", label: "Severity", weight: 35, color: "bg-brand-500" },
  { id: "impact", label: "Public impact", weight: 25, color: "bg-accent-500" },
  { id: "recurrence", label: "Recurrence", weight: 20, color: "bg-amber-500" },
  { id: "urgency", label: "Urgency", weight: 20, color: "bg-orange-500" },
] as const;

export const AREAS = [
  "School Road, Ward 4",
  "Maple Market, Ward 2",
  "Rosewood Lane, Ward 6",
  "Central Park, Ward 3",
  "City Bus Stop, Ward 5",
  "Market Street, Ward 2",
  "Greenwood Apartments, Ward 7",
  "Riverside Walk, Ward 3",
  "Sector 7, Ward 1",
  "Riverfront Park, Ward 3",
  "Ring Road, Ward 8",
  "Ward 2 Collection Zone",
];

export const ADMIN_NAME = "Meera Shah";
