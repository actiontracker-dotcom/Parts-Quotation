"use client";

import { cn } from "@/lib/utils/cn";

export default function Card({ className, children, ...props }) {
  return (
    <div
      className={cn("rounded-xl2 border border-ink-100 bg-white shadow-card", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ eyebrow, title, description, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-b border-ink-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-500">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-0.5 text-lg font-semibold text-ink-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-400">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, children }) {
  return <div className={cn("px-6 py-6", className)}>{children}</div>;
}
