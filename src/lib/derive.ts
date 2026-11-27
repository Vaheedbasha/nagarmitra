import type { Complaint } from "@/types";
import { categoryMeta } from "@/lib/constants";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const COLORS = ["#4F46E5", "#14B8A6", "#0EA5E9", "#F59E0B", "#8B5CF6", "#94A3B8", "#EC4899"];

export function deriveAnalytics(complaints: Complaint[]) {
  const total = complaints.length;
  const submitted = complaints.filter((c) => c.status === "submitted").length;
  const review = complaints.filter((c) => c.status === "review").length;
  const progress = complaints.filter((c) => c.status === "progress").length;
  const resolved = complaints.filter((c) => c.status === "resolved").length;
  const highPriority = complaints.filter((c) => c.priority === "high").length;
  const critical = complaints.filter((c) => c.priority === "critical").length;
  const confirmations = complaints.reduce((sum, c) => sum + c.upvotes, 0);

  const OVERVIEW_STATS = {
    total,
    pending: submitted + review,
    progress,
    resolved,
    highPriority: highPriority + critical,
    trends: { total: 0, pending: 0, progress: 0, resolved: 0, highPriority: 0 },
  };

  // Reports and resolutions per calendar day for the last 14 days.
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: `${date.getDate()} ${MONTHS[date.getMonth()]}`,
      reports: complaints.filter((c) => c.date === key).length,
      resolved: complaints.filter((c) => c.status === "resolved" && c.updated === key).length,
    };
  });

  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      label: DAYS[date.getDay()],
      reports: complaints.filter((c) => c.date === key).length,
      resolved: complaints.filter((c) => c.status === "resolved" && c.updated === key).length,
    };
  });

  // Last six months, including the current one.
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    const prefix = date.toISOString().slice(0, 7);
    return {
      label: MONTHS[date.getMonth()],
      reports: complaints.filter((c) => c.date.startsWith(prefix)).length,
      resolved: complaints.filter((c) => c.status === "resolved" && c.updated.startsWith(prefix)).length,
    };
  });

  const categoryCounts = new Map<string, number>();
  complaints.forEach((complaint) => {
    categoryCounts.set(complaint.category, (categoryCounts.get(complaint.category) ?? 0) + 1);
  });
  const CATEGORY_BREAKDOWN = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id, value], index) => ({
      label: categoryMeta(id as Complaint["category"]).label,
      value,
      color: COLORS[index % COLORS.length],
    }));

  const priorityOrder = ["critical", "high", "medium", "low"] as const;
  const PRIORITY_BREAKDOWN = priorityOrder.map((id) => ({
    label: id[0].toUpperCase() + id.slice(1),
    value: complaints.filter((complaint) => complaint.priority === id).length,
    color: { critical: "#DC2626", high: "#F97316", medium: "#F59E0B", low: "#94A3B8" }[id],
  }));

  const areaMap = new Map<string, { area: string; ward: string; reports: number; resolved: number }>();
  complaints.forEach((complaint) => {
    const entry = areaMap.get(complaint.area) ?? {
      area: complaint.area,
      ward: complaint.ward ?? "—",
      reports: 0,
      resolved: 0,
    };
    entry.reports += 1;
    if (complaint.status === "resolved") entry.resolved += 1;
    areaMap.set(complaint.area, entry);
  });
  const AREA_HOTSPOTS = [...areaMap.values()].sort((a, b) => b.reports - a.reports).slice(0, 8);

  const resolvedItems = complaints.filter(
    (complaint) => complaint.status === "resolved" && complaint.date && complaint.updated
  );
  const avgDays = resolvedItems.length
    ? Math.round(
        (resolvedItems.reduce((sum, complaint) => {
          const from = new Date(`${complaint.date}T00:00:00`).getTime();
          const to = new Date(`${complaint.updated}T00:00:00`).getTime();
          return sum + Math.max(0, (to - from) / 86_400_000);
        }, 0) /
          resolvedItems.length) *
          10
      ) / 10
    : null;

  const withSla = complaints.filter((complaint) => complaint.slaDue);
  const onTime = withSla.filter(
    (complaint) =>
      complaint.status === "resolved" &&
      complaint.slaDue &&
      new Date(complaint.updated).getTime() <= new Date(complaint.slaDue).getTime()
  ).length;
  const onTimeRate = withSla.length ? Math.round((onTime / withSla.length) * 100) : null;

  const RESOLUTION_PERFORMANCE = {
    avgDays,
    onTimeRate,
    confirmations,
    resolutionRate: total ? Math.round((resolved / total) * 100) : 0,
    weekly: months.map((month, index) => ({
      label: `M${index + 1}`,
      value: month.resolved,
    })),
  };

  return {
    OVERVIEW_STATS,
    REPORTS_TREND: days,
    WEEKLY_TREND: week,
    MONTHLY_TREND: months,
    CATEGORY_BREAKDOWN,
    PRIORITY_BREAKDOWN,
    AREA_HOTSPOTS,
    RESOLUTION_PERFORMANCE,
  };
}
