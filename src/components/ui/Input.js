"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils/cn";
import { filledFieldStyle } from "@/lib/utils/filledFieldStyle";
import FieldShell from "@/components/ui/FieldShell";

const Input = forwardRef(function Input(
  { label, required, error, hint, className, containerClassName, icon: Icon, ...props },
  ref
) {
  const generatedId = useId();
  const id = props.id || generatedId;
  const hasValue = props.value !== undefined && props.value !== null && props.value !== "";

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
            "h-10 w-full rounded-lg border px-3 text-sm placeholder:text-ink-300 transition-all duration-200 cursor-text",
            Icon && "pl-9",
            filledFieldStyle(hasValue, !!error),
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
