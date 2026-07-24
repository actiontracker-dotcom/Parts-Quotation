"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils/cn";
import { filledFieldStyle } from "@/lib/utils/filledFieldStyle";
import FieldShell from "@/components/ui/FieldShell";

const Textarea = forwardRef(function Textarea(
  { label, required, error, hint, className, containerClassName, rows = 3, ...props },
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
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        className={cn(
          "w-full resize-none rounded-lg border px-3 py-2 text-sm placeholder:text-ink-300 transition-all duration-200 cursor-text",
          filledFieldStyle(hasValue, !!error),
          className
        )}
        aria-invalid={!!error}
        {...props}
      />
    </FieldShell>
  );
});

export default Textarea;
