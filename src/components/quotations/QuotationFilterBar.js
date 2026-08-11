"use client";

import { Filter, X, Download, Loader2 } from "lucide-react";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";

const DATE_WISE_OPTIONS = [
  { value: "All", label: "All" },
  { value: "Today", label: "Today" },
  { value: "This Week", label: "This Week" },
  { value: "This Month", label: "This Month" },
  { value: "This Year", label: "This Year" },
  { value: "Custom Date Range", label: "Custom Date Range" },
];

export default function QuotationFilterBar({
  orderStatusOptions = [],
  divisionOptions = [],
  filters,
  onFilterChange,
  onClearFilters,
  activeFilterCount = 0,
  filteredCount = 0,
  onDownloadExcel,
  downloading = false,
}) {
  const isCustomRange = filters.dateWise === "Custom Date Range";
  const rangeInvalid = Boolean(
    filters.fromDate && filters.toDate && filters.fromDate > filters.toDate
  );

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-4 shadow-card sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-accent-500" />
          <h3 className="text-sm font-semibold text-ink-900">Filters</h3>
        </div>
        <button
          type="button"
          onClick={onClearFilters}
          disabled={activeFilterCount === 0}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150",
            activeFilterCount === 0
              ? "cursor-not-allowed text-ink-300"
              : "cursor-pointer text-ink-500 hover:bg-ink-50 hover:text-ink-800"
          )}
        >
          <X className="h-3.5 w-3.5" />
          Clear Filters
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select
          label="Order Status"
          options={orderStatusOptions}
          value={filters.orderStatus}
          onChange={(e) => onFilterChange({ orderStatus: e.target.value })}
        />
        <Select
          label="Division"
          options={divisionOptions}
          value={filters.division}
          onChange={(e) => onFilterChange({ division: e.target.value })}
        />
        <Select
          label="Date Wise"
          options={DATE_WISE_OPTIONS}
          value={filters.dateWise}
          onChange={(e) => onFilterChange({ dateWise: e.target.value })}
        />
      </div>

      {isCustomRange && (
        <div className="mt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:max-w-md">
            <Input
              type="date"
              label="From Date"
              value={filters.fromDate || ""}
              max={filters.toDate || undefined}
              onChange={(e) => onFilterChange({ fromDate: e.target.value })}
            />
            <Input
              type="date"
              label="To Date"
              value={filters.toDate || ""}
              min={filters.fromDate || undefined}
              onChange={(e) => onFilterChange({ toDate: e.target.value })}
            />
          </div>
          {rangeInvalid && (
            <p className="mt-2 text-xs font-medium text-danger-500">
              From Date cannot be later than To Date. The date filter has not been applied.
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onDownloadExcel}
          disabled={downloading || filteredCount === 0}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors duration-150 cursor-pointer",
            downloading || filteredCount === 0
              ? "cursor-not-allowed border-ink-100 bg-ink-50 text-ink-300"
              : "border-accent-200 bg-accent-50 text-accent-700 hover:bg-accent-100"
          )}
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download Excel
        </button>
      </div>
    </div>
  );
}
