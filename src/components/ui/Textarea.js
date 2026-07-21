"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils/cn";
import FieldShell from "@/components/ui/FieldShell";

const Textarea = forwardRef(function Textarea(
  { label, required, error, hint, className, containerClassName, rows = 3, ...props },
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
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        className={cn(
          "w-full resize-none rounded-lg border bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-300",
          "transition-colors duration-150",
          error
            ? "border-danger-300 focus:ring-danger-400"
            : "border-ink-100 hover:border-ink-200 focus:border-accent-400",
          className
        )}
        aria-invalid={!!error}
        {...props}
      />
    </FieldShell>
  );
});

export default Textarea;
