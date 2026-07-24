"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export default function Pagination({ page, totalPages, total, limit, onPageChange }) {
  if (totalPages <= 1) return null;

  function getPageNumbers() {
    const pages = [];
    const delta = 2;
    const left = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);

    pages.push(1);
    if (left > 2) pages.push("...");
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push("...");
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  }

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
      <p className="text-sm text-ink-400">
        Showing <span className="font-medium text-ink-600">{start}</span>–<span className="font-medium text-ink-600">{end}</span> of{" "}
        <span className="font-medium text-ink-600">{total}</span>
      </p>

      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-ink-100 text-ink-500 hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {getPageNumbers().map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="inline-flex items-center justify-center h-9 w-9 text-sm text-ink-300">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
                className={cn(
                  "inline-flex items-center justify-center h-9 min-w-[36px] rounded-md text-sm font-medium transition-colors cursor-pointer",
                  p === page
                    ? "bg-accent-500 text-white shadow-sm"
                    : "border border-ink-100 text-ink-600 hover:bg-ink-50"
                )}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-ink-100 text-ink-500 hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}
