"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const VARIANTS = {
  primary:
    "bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700 shadow-card disabled:bg-ink-200",
  secondary:
    "bg-white text-ink-700 border border-ink-100 hover:border-ink-200 hover:bg-ink-50 disabled:text-ink-300",
  ghost: "bg-transparent text-ink-500 hover:bg-ink-50 hover:text-ink-800",
  danger: "bg-danger-500 text-white hover:bg-danger-600 disabled:bg-ink-200",
  subtle: "bg-accent-50 text-accent-700 hover:bg-accent-100",
};

const SIZES = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-base gap-2",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  iconPosition = "left",
  loading = false,
  className,
  disabled,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-semibold transition-colors duration-150 cursor-pointer",
        "disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        Icon && iconPosition === "left" && <Icon className="h-4 w-4" />
      )}
      {children}
      {!loading && Icon && iconPosition === "right" && <Icon className="h-4 w-4" />}
    </button>
  );
}
