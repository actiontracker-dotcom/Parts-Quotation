"use client";

import { Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

function SkeletonRow({ cols }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-ink-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

const COLUMNS = [
  { key: "partNo", label: "Part Number", sortable: true },
  { key: "description", label: "Description", sortable: true },
  { key: "group", label: "Group", sortable: true },
  { key: "subGroup", label: "Sub Group", sortable: true },
  { key: "standardRate", label: "Std Rate", sortable: true },
  { key: "totalQty", label: "Total Qty", sortable: true },
  { key: "stockStatus", label: "Stock", sortable: true },
  { key: "hsnCode", label: "HSN", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "createdAt", label: "Created", sortable: true },
];

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PartTable({
  parts,
  loading,
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
}) {
  if (loading && !parts.length) {
    return (
      <div className="overflow-x-auto rounded-lg border border-ink-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink-50 border-b border-ink-100">
              {COLUMNS.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left font-semibold text-ink-600 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-semibold text-ink-600 whitespace-nowrap w-20">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} cols={COLUMNS.length + 1} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!parts.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border border-dashed border-ink-200">
        <div className="h-12 w-12 rounded-full bg-ink-50 flex items-center justify-center mb-3">
          <svg className="h-6 w-6 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <p className="text-ink-500 font-medium">No parts found</p>
        <p className="text-ink-400 text-sm mt-1">Try adjusting your search or add a new part.</p>
      </div>
    );
  }

  function SortHeader({ column }) {
    const isActive = sortBy === column.key;
    return (
      <th
        className={cn(
          "px-4 py-3 text-left font-semibold text-ink-600 whitespace-nowrap",
          column.sortable && "cursor-pointer select-none hover:text-ink-900"
        )}
        onClick={() => column.sortable && onSort(column.key)}
      >
        <span className="inline-flex items-center gap-1">
          {column.label}
          {column.sortable && (
            <ArrowUpDown className={cn("h-3.5 w-3.5", isActive ? "text-accent-500" : "text-ink-300")} />
          )}
        </span>
      </th>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-ink-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-ink-50 border-b border-ink-100">
            {COLUMNS.map((col) => (
              <SortHeader key={col.key} column={col} />
            ))}
            <th className="px-4 py-3 text-right font-semibold text-ink-600 whitespace-nowrap w-20">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {parts.map((p, i) => (
            <tr
              key={p._id}
              className={cn(
                "border-b border-ink-50 transition-colors hover:bg-ink-50/50",
                i % 2 === 0 ? "bg-white" : "bg-ink-50/30"
              )}
            >
              <td className="px-4 py-3 font-medium text-ink-900 font-mono text-xs">{p.partNo}</td>
              <td className="px-4 py-3 text-ink-600 max-w-[200px] truncate" title={p.description}>
                {p.description || "-"}
              </td>
              <td className="px-4 py-3 text-ink-600">{p.group || "-"}</td>
              <td className="px-4 py-3 text-ink-600">{p.subGroup || "-"}</td>
              <td className="px-4 py-3 text-ink-600 font-mono text-xs">{(p.standardRate || 0).toLocaleString("en-IN")}</td>
              <td className="px-4 py-3 text-ink-600 font-mono text-xs">{p.totalQty || 0}</td>
              <td className="px-4 py-3">
                <span className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  p.stockStatus === "in-stock" || p.stockStatus === "In Stock" ? "bg-success-50 text-success-700" :
                  p.stockStatus === "out-of-stock" || p.stockStatus === "Out of Stock" ? "bg-danger-50 text-danger-700" :
                  "bg-warning-50 text-warning-700"
                )}>
                  {p.stockStatus || "-"}
                </span>
              </td>
              <td className="px-4 py-3 text-ink-600 font-mono text-xs">{p.hsnCode || "-"}</td>
              <td className="px-4 py-3">
                <span className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  p.status === "active" ? "bg-success-50 text-success-700" : "bg-ink-50 text-ink-600"
                )}>
                  {p.status || "active"}
                </span>
              </td>
              <td className="px-4 py-3 text-ink-400 text-xs whitespace-nowrap">{formatDate(p.createdAt)}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <button
                  onClick={() => onEdit(p)}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md text-ink-400 hover:text-accent-600 hover:bg-accent-50 transition-colors cursor-pointer"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(p)}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md text-ink-400 hover:text-danger-600 hover:bg-danger-50 transition-colors cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
