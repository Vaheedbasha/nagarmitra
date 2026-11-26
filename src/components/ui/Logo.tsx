import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface LogoProps {
  to?: string;
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  compact?: boolean;
}

export function LogoMark({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const dim = size === "sm" ? 32 : size === "lg" ? 44 : 38;

  return (
    <div
      className={cn("relative inline-flex flex-shrink-0 select-none", className)}
      style={{ width: dim, height: dim }}
    >
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
      >
        <defs>
          <linearGradient id="cf-blue-gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="cf-spark-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>

        {/* Squircle Tile Base */}
        <rect width="40" height="40" rx="11" fill="url(#cf-blue-gradient)" />

        {/* Pin Halo */}
        <path
          d="M20 7C14.7 7 10.5 11.2 10.5 16.5C10.5 22.8 18.2 30.5 19.4 31.7C19.7 32 20.3 32 20.6 31.7C21.8 30.5 29.5 22.8 29.5 16.5C29.5 11.2 25.3 7 20 7Z"
          fill="white"
          fillOpacity="0.16"
        />

        {/* Precision Civic Pin Outline */}
        <path
          d="M20 8.5C15.5 8.5 12 12 12 16.5C12 21.8 18.5 28.2 20 29.6C21.5 28.2 28 21.8 28 16.5C28 12 24.5 8.5 20 8.5Z"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Upward Resolution Checkmark */}
        <path
          d="M16 16.8L18.8 19.6L24.5 13.9"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* AI Intelligence Sparkle Node */}
        <circle cx="31.5" cy="8.5" r="3.8" fill="url(#cf-spark-gradient)" stroke="#1D4ED8" strokeWidth="1.5" />
        <circle cx="31.5" cy="8.5" r="1.4" fill="white" />
      </svg>
    </div>
  );
}

export function Logo({ to = "/", variant = "dark", size = "md", compact }: LogoProps) {
  const content = (
    <span className="group flex items-center gap-2.5">
      <LogoMark size={size} />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-display tracking-tight transition-colors",
              size === "sm" ? "text-[16px]" : size === "lg" ? "text-[21px]" : "text-[18px]",
              variant === "dark" ? "text-slate-900 group-hover:text-brand-600" : "text-white"
            )}
          >
            <span className="font-extrabold">City</span>
            <span className={cn("font-black", variant === "dark" ? "text-brand-600" : "text-brand-200")}>
              Fix
            </span>
          </span>
          <span
            className={cn(
              "mt-1 text-[8.5px] font-bold uppercase tracking-[0.2em]",
              variant === "dark" ? "text-slate-400" : "text-slate-400"
            )}
          >
            Civic Intelligence
          </span>
        </span>
      )}
    </span>
  );

  return (
    <Link to={to} className="focus-ring inline-flex rounded-xl" aria-label="CityFix home">
      {content}
    </Link>
  );
}
