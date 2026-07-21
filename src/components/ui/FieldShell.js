"use client";

import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export default function FieldShell({
  label,
  htmlFor,
  required,
  error,
  hint,
  className,
  children,
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-ink-600 flex items-center gap-1"
        >
          {label}
          {required && <span className="text-danger-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="flex items-center gap-1 text-xs font-medium text-danger-500" role="alert">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-300">{hint}</p>
      ) : null}
    </div>
  );
}
