"use client";

import { forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import FieldShell from "@/components/ui/FieldShell";

const Select = forwardRef(function Select(
  { label, required, error, hint, className, containerClassName, options = [], placeholder, ...props },
  ref
) {
  const generatedId = useId();
  const id = props.id || generatedId;

  return (
    <FieldShell
      label={label}
      htmlFor={id}
      required={required}
      error={error}
      hint={hint}
      className={containerClassName}
    >
      <div className="relative">
        <select
          ref={ref}
          id={id}
          className={cn(
            "h-10 w-full appearance-none rounded-lg border bg-white pl-3 pr-9 text-sm text-ink-800",
            "transition-colors duration-150",
            error
              ? "border-danger-300 focus:ring-danger-400"
              : "border-ink-100 hover:border-ink-200 focus:border-accent-400",
            !props.value && "text-ink-300",
            className
          )}
          aria-invalid={!!error}
          {...props}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
      </div>
    </FieldShell>
  );
});

export default Select;
