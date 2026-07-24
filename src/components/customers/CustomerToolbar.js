"use client";

import { Search, RefreshCw, Plus } from "lucide-react";
import Button from "@/components/ui/Button";

export default function CustomerToolbar({
  search,
  onSearchChange,
  onRefresh,
  loading,
  customerCount,
  onAdd,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search customers..."
          className="w-full h-10 pl-10 pr-4 rounded-lg border border-ink-100 bg-white text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors cursor-text"
        />
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-ink-400 whitespace-nowrap">
          {customerCount} customer{customerCount !== 1 ? "s" : ""}
        </span>
        <Button
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          onClick={onRefresh}
          loading={loading}
        >
          Refresh
        </Button>
        <Button size="sm" icon={Plus} onClick={onAdd}>
          Add Customer
        </Button>
      </div>
    </div>
  );
}
