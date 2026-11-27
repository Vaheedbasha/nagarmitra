import type { Request, Response } from "express";

export function text(value: unknown, max = 4000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/** Accepts Indian and international formats with 8-15 digits. */
export function normalisePhone(value: string) {
  const digits = value.replace(/[^\d+]/g, "");
  return digits;
}

export function isPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

export function passwordProblem(password: string): string | null {
  if (password.length < 10) return "Password must be at least 10 characters.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
    return "Password must include letters and numbers.";
  return null;
}

export function bad(res: Response, status: number, error: string, extra: Record<string, unknown> = {}) {
  res.status(status).json({ error, ...extra });
}

export function parseNumber(value: unknown, min: number, max: number): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(max, Math.max(min, parsed));
}

export function queryString(req: Request, key: string): string {
  const value = req.query[key];
  return typeof value === "string" ? value : "";
}
