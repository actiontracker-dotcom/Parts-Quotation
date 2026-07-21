"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils/cn";
import FieldShell from "@/components/ui/FieldShell";

const Input = forwardRef(function Input(
  { label, required, error, hint, className, containerClassName, icon: Icon, ...props },
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
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "h-10 w-full rounded-lg border bg-white text-sm text-ink-800 placeholder:text-ink-300",
            "px-3 transition-colors duration-150",
            Icon && "pl-9",
            error
              ? "border-danger-300 focus:ring-danger-400"
              : "border-ink-100 hover:border-ink-200 focus:border-accent-400",
            className
          )}
          aria-invalid={!!error}
          {...props}
        />
      </div>
    </FieldShell>
  );
});

export default Input;
