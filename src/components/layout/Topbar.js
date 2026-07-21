"use client";

import { Menu } from "lucide-react";

export default function Topbar({ onMenuClick, breadcrumb, title }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink-100 bg-surface/80 px-4 py-4 backdrop-blur sm:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          {breadcrumb && (
            <p className="text-xs font-medium uppercase tracking-wider text-ink-300">
              {breadcrumb}
            </p>
          )}
          <h1 className="font-display text-lg font-semibold text-ink-900 sm:text-xl">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-accent-100 text-sm font-semibold text-accent-700 sm:flex">
          SE
        </div>
      </div>
    </header>
  );
}
