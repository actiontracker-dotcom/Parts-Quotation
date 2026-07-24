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
  { key: "customerName", label: "Customer Name", sortable: true },
  { key: "contactPerson", label: "Contact", sortable: false },
  { key: "contactNumber", label: "Phone", sortable: false },
  { key: "email", label: "Email", sortable: false },
  { key: "gstNo", label: "GSTIN", sortable: false },
  { key: "stateName", label: "State", sortable: true },
];

export default function CustomerTable({
  customers,
  loading,
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
}) {
  if (loading && !customers.length) {
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

  if (!customers.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border border-dashed border-ink-200">
        <div className="h-12 w-12 rounded-full bg-ink-50 flex items-center justify-center mb-3">
          <svg className="h-6 w-6 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-ink-500 font-medium">No customers found</p>
        <p className="text-ink-400 text-sm mt-1">Try adjusting your search or add a new customer.</p>
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
          {customers.map((c, i) => (
            <tr
              key={c._id}
              className={cn(
                "border-b border-ink-50 transition-colors hover:bg-ink-50/50",
                i % 2 === 0 ? "bg-white" : "bg-ink-50/30"
              )}
            >
              <td className="px-4 py-3 font-medium text-ink-900 max-w-[220px] truncate" title={c.customerName}>
                {c.customerName}
              </td>
              <td className="px-4 py-3 text-ink-600">{c.contactPerson || "-"}</td>
              <td className="px-4 py-3 text-ink-600 whitespace-nowrap">{c.contactNumber || "-"}</td>
              <td className="px-4 py-3 text-ink-600 max-w-[180px] truncate" title={c.email}>
                {c.email || "-"}
              </td>
              <td className="px-4 py-3 text-ink-600 font-mono text-xs">{c.gstNo || "-"}</td>
              <td className="px-4 py-3 text-ink-600">{c.stateName || "-"}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <button
                  onClick={() => onEdit(c)}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md text-ink-400 hover:text-accent-600 hover:bg-accent-50 transition-colors cursor-pointer"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(c)}
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
