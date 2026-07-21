"use client";

import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const VARIANT_STYLES = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-teal-500",
    barClass: "bg-teal-500",
  },
  error: {
    icon: XCircle,
    iconClass: "text-danger-500",
    barClass: "bg-danger-500",
  },
  info: {
    icon: Info,
    iconClass: "text-accent-500",
    barClass: "bg-accent-500",
  },
};

export default function Toaster({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-[100] flex w-full max-w-sm flex-col gap-2.5"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => {
        const style = VARIANT_STYLES[t.variant] || VARIANT_STYLES.info;
        const Icon = style.icon;
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              "relative overflow-hidden rounded-xl border border-ink-100 bg-white shadow-card-hover",
              t.closing ? "animate-fade-slide-out" : "animate-toast-in"
            )}
          >
            <span className={cn("absolute left-0 top-0 h-full w-1", style.barClass)} />
            <div className="flex items-start gap-3 py-3 pl-4 pr-3">
              <Icon className={cn("mt-0.5 h-5 w-5 flex-shrink-0", style.iconClass)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 text-sm leading-snug text-ink-400">{t.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onDismiss(t.id)}
                className="rounded-md p-1 text-ink-300 transition hover:bg-ink-50 hover:text-ink-600"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
