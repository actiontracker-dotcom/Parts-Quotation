"use client";

import { cn } from "@/lib/utils/cn";

const TONES = {
  neutral: "bg-ink-50 text-ink-500",
  accent: "bg-accent-50 text-accent-700",
  teal: "bg-teal-50 text-teal-700",
  amber: "bg-amber-50 text-amber-600",
  danger: "bg-danger-50 text-danger-600",
};

export default function Badge({ tone = "neutral", className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
