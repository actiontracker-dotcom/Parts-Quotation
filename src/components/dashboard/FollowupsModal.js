"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  X,
  Calendar,
  Loader2,
  Inbox,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import Button from "@/components/ui/Button";
import QuotationFollowupModal from "@/components/quotations/QuotationFollowupModal";
import { cn } from "@/lib/utils/cn";
import { parseQuotationDate, toDateKey, addDays, startOfWeek } from "@/lib/utils/dateUtils";

const LIMIT = 20;

const PRESETS = [
  { id: "all", label: "All Dates" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 Days" },
  { id: "thisWeek", label: "This Week" },
  { id: "lastWeek", label: "Last Week" },
  { id: "thisMonth", label: "This Month" },
  { id: "lastMonth", label: "Last Month" },
];

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseDateKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ""));
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKeyShort(key) {
  const date = parseDateKey(key);
  if (!date) return key;
  return `${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`;
}

function formatDateCell(value) {
  if (!value) return "—";
  const date = parseQuotationDate(value);
  if (!date) return String(value).trim() || "—";
  return `${date.getDate()} ${MONTH_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

function getPageItems(current, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) items.push("…");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < totalPages - 1) items.push("…");
  items.push(totalPages);
  return items;
}

function StatusPill({ value }) {
  const v = String(value || "").trim();
  const tone =
    v === "Completed" ? "bg-teal-50 text-teal-700" : "bg-amber-50 text-amber-700";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", tone)}>
      {v || "—"}
    </span>
  );
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// Resolves a quick preset to the concrete list of YYYY-MM-DD date keys it
// represents. "All Dates" returns an empty list (meaning: no date restriction).
// Past, today and future dates are all valid — nothing is ever disabled.
function presetDates(id, now) {
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (id) {
    case "today":
      return [toDateKey(t)];
    case "yesterday":
      return [toDateKey(addDays(t, -1))];
    case "last7":
      return Array.from({ length: 7 }, (_, i) => toDateKey(addDays(t, -i)));
    case "thisWeek": {
      const start = startOfWeek(t);
      return Array.from({ length: 7 }, (_, i) => toDateKey(addDays(start, i)));
    }
    case "lastWeek": {
      const start = addDays(startOfWeek(t), -7);
      return Array.from({ length: 7 }, (_, i) => toDateKey(addDays(start, i)));
    }
    case "thisMonth": {
      const days = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
      return Array.from({ length: days }, (_, i) =>
        toDateKey(new Date(t.getFullYear(), t.getMonth(), i + 1))
      );
    }
    case "lastMonth": {
      const days = new Date(t.getFullYear(), t.getMonth(), 0).getDate();
      return Array.from({ length: days }, (_, i) =>
        toDateKey(new Date(t.getFullYear(), t.getMonth() - 1, i + 1))
      );
    }
    default:
      return [];
  }
}

export default function FollowupsModal({ isOpen, onClose, onDataChanged }) {
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState("Pending");
  const [selectedDates, setSelectedDates] = useState(() => new Set());
  const [activePreset, setActivePreset] = useState("all");
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [page, setPage] = useState(1);
  const [followUpRecord, setFollowUpRecord] = useState(null);

  const [records, setRecords] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // On open the filter always starts fresh: Pending + All Dates.
  useEffect(() => {
    if (!isOpen) return;
    setStatus("Pending");
    setSelectedDates(new Set());
    setActivePreset("all");
    setPage(1);
    setViewMonth(startOfMonth(new Date()));
    setDatePopoverOpen(false);
    setCustomMode(false);
    setFollowUpRecord(null);
  }, [isOpen]);

  // When the popover closes, reset to the preset view so the calendar is not
  // shown immediately on the next open.
  useEffect(() => {
    if (!datePopoverOpen) setCustomMode(false);
  }, [datePopoverOpen]);

  useEffect(() => {
    function handleEscape(e) {
      if (e.key !== "Escape" || !isOpen) return;
      if (followUpRecord) return;
      if (datePopoverOpen) {
        setDatePopoverOpen(false);
        return;
      }
      onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, datePopoverOpen, followUpRecord]);

  useEffect(() => {
    if (!datePopoverOpen) return;
    function handlePointerDown(e) {
      if (triggerRef.current && triggerRef.current.contains(e.target)) return;
      if (popoverRef.current && popoverRef.current.contains(e.target)) return;
      setDatePopoverOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [datePopoverOpen]);

  const load = useCallback(async (nextStatus, nextDates, nextPage) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("status", nextStatus);
      if (nextDates.size > 0) {
        params.set("dates", Array.from(nextDates).sort().join(","));
      }
      params.set("page", String(nextPage));
      params.set("limit", String(LIMIT));

      const res = await fetch(`/api/dashboard/followups?${params.toString()}`);
      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Unable to load follow-ups. Please try again.");
        setRecords([]);
        setPagination(null);
        return;
      }
      setRecords(json.records || []);
      setPagination(json.pagination || null);
    } catch (err) {
      setError(err.message || "Unable to load follow-ups. Please try again.");
      setRecords([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    load(status, selectedDates, page);
  }, [isOpen, status, selectedDates, page, load]);

  function handlePreset(id) {
    setSelectedDates(new Set(presetDates(id, new Date())));
    setActivePreset(id);
    setPage(1);
    setDatePopoverOpen(false);
  }

  function handleClearDates() {
    setSelectedDates(new Set());
    setActivePreset("all");
    setPage(1);
  }

  function toggleDate(key, date) {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setActivePreset(null);
    setPage(1);
    if (date && date.getMonth() !== viewMonth.getMonth()) {
      setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }

  const calendarCells = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const start = addDays(first, -first.getDay());
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [viewMonth]);

  if (!mounted || !isOpen) return null;

  const todayKey = toDateKey(new Date());
  const selectedKeys = Array.from(selectedDates).sort();

  const selectionLabel = (() => {
    if (activePreset && activePreset !== "custom") {
      const preset = PRESETS.find((p) => p.id === activePreset);
      if (preset) return preset.label;
    }
    if (selectedKeys.length === 0) return "All Dates";
    if (selectedKeys.length === 1) return dateKeyShort(selectedKeys[0]);
    if (selectedKeys.length <= 3) return selectedKeys.map(dateKeyShort).join(", ");
    return `${selectedKeys.length} dates selected`;
  })();

  const total = pagination?.total || 0;
  const totalPages = pagination?.totalPages || 1;
  const pageStart = total === 0 ? 0 : (pagination?.offset || 0) + 1;
  const pageEnd = Math.min((pagination?.offset || 0) + LIMIT, total);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="fixed inset-0 bg-ink-950/40 cursor-pointer" onClick={onClose} />
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-xl bg-white shadow-xl sm:h-[88vh] sm:max-h-[88vh] sm:w-[92vw] sm:max-w-[92vw]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Calendar className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent-500">
                Follow-ups
              </p>
              <h2 className="mt-0.5 text-lg font-semibold text-ink-900">Follow-up Details</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-300 hover:text-ink-600 hover:bg-ink-50 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="w-full sm:w-56">
                <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-ink-600">
                  Status
                </label>
                <div className="flex h-10 w-full items-center rounded-lg border border-ink-100 bg-white px-3 text-sm text-ink-800">
                  Pending
                </div>
              </div>

              <div className="w-full sm:w-72">
                <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-ink-600">
                  Date
                </label>
                <div className="relative">
                  <button
                    ref={triggerRef}
                    type="button"
                    onClick={() => setDatePopoverOpen((o) => !o)}
                    className={cn(
                      "flex h-10 w-full items-center gap-2 rounded-lg border bg-white px-3 text-sm transition-colors cursor-pointer",
                      datePopoverOpen ? "border-accent-400" : "border-ink-100 hover:border-ink-200"
                    )}
                  >
                    <Calendar className="h-4 w-4 shrink-0 text-ink-400" />
                    <span className="min-w-0 flex-1 truncate text-left text-ink-800">
                      {selectionLabel}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-ink-300 transition-transform",
                        datePopoverOpen && "rotate-180"
                      )}
                    />
                  </button>

                  {datePopoverOpen && (
                    <div
                      ref={popoverRef}
                      className="absolute left-0 top-full z-30 mt-1.5 w-[300px] max-w-[calc(100vw-2rem)] rounded-xl border border-ink-100 bg-white p-3 shadow-xl"
                    >
                      {!customMode ? (
                        <>
                          <div className="grid grid-cols-2 gap-1.5">
                            {PRESETS.map((preset) => {
                              const active = activePreset === preset.id;
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => handlePreset(preset.id)}
                                  className={cn(
                                    "rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors cursor-pointer",
                                    active
                                      ? "bg-accent-50 text-accent-700"
                                      : "text-ink-600 hover:bg-ink-50"
                                  )}
                                >
                                  {preset.label}
                                </button>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setActivePreset("custom");
                              setCustomMode(true);
                            }}
                            className={cn(
                              "mt-2 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors cursor-pointer",
                              activePreset === "custom"
                                ? "border-accent-200 bg-accent-50 text-accent-700"
                                : "border-ink-100 text-ink-700 hover:bg-ink-50"
                            )}
                          >
                            <Calendar className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                            Custom Dates
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() =>
                                setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
                              }
                              className="rounded-md p-1 text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-700 cursor-pointer"
                              aria-label="Previous month"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <p className="text-xs font-semibold text-ink-900">
                              {MONTH_FULL[viewMonth.getMonth()]} {viewMonth.getFullYear()}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
                              }
                              className="rounded-md p-1 text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-700 cursor-pointer"
                              aria-label="Next month"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-2 grid grid-cols-7 gap-0.5">
                            {WEEKDAY_LABELS.map((d) => (
                              <span
                                key={d}
                                className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-ink-400"
                              >
                                {d}
                              </span>
                            ))}
                            {calendarCells.map((date) => {
                              const key = toDateKey(date);
                              const inMonth = date.getMonth() === viewMonth.getMonth();
                              const isSelected = selectedDates.has(key);
                              const isToday = key === todayKey;
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => toggleDate(key, date)}
                                  className={cn(
                                    "h-7 w-full rounded-md text-[11px] font-medium transition-colors cursor-pointer",
                                    isSelected
                                      ? "bg-accent-500 text-white hover:bg-accent-600"
                                      : isToday
                                        ? "bg-accent-50 text-accent-700 ring-1 ring-inset ring-accent-400 hover:bg-accent-100"
                                        : inMonth
                                          ? "text-ink-700 hover:bg-ink-50"
                                          : "text-ink-300 hover:bg-ink-50"
                                  )}
                                >
                                  {date.getDate()}
                                </button>
                              );
                            })}
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-2 border-t border-ink-50 pt-2">
                            <p className="min-w-0 truncate text-[11px] text-ink-500">
                              {selectedKeys.length === 0
                                ? "All dates"
                                : selectedKeys.length === 1
                                  ? dateKeyShort(selectedKeys[0])
                                  : selectedKeys.length <= 3
                                    ? selectedKeys.map(dateKeyShort).join(", ")
                                    : `${selectedKeys.length} dates selected`}
                            </p>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <button
                                type="button"
                                onClick={handleClearDates}
                                disabled={selectedKeys.length === 0}
                                className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-ink-500 transition-colors cursor-pointer hover:bg-ink-50 disabled:cursor-not-allowed disabled:text-ink-300"
                              >
                                Clear
                              </button>
                              <button
                                type="button"
                                onClick={() => setDatePopoverOpen(false)}
                                className="rounded-lg bg-accent-500 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors cursor-pointer hover:bg-accent-600"
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="sm:pb-1">
              {total > 0 && (
                <p className="text-sm text-ink-400">
                  <span className="font-semibold text-ink-700">{total}</span> matching record
                  {total === 1 ? "" : "s"}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4">
            {loading && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-accent-500" />
                <p className="mt-3 text-sm text-ink-400">Loading follow-ups...</p>
              </div>
            )}

            {!loading && error && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-50 text-danger-600">
                  <Inbox className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-medium text-danger-600">{error}</p>
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={() => load(status, selectedDates, page)}
                >
                  Retry
                </Button>
              </div>
            )}

            {!loading && !error && records.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-50 text-accent-600">
                  <Calendar className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm text-ink-500">
                  No follow-ups found for the selected filters.
                </p>
                <p className="mt-1 text-xs text-ink-400">
                  Try a different status or date selection.
                </p>
              </div>
            )}

            {!loading && !error && records.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-ink-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-ink-50 border-b border-ink-100">
                      {["Quotation No", "Customer Name", "Next Followup Date", "Followup Status", "Followup Remark", "Action"].map((h) => (
                        <th key={h} className="px-5 py-4 text-left font-semibold text-ink-600 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record, idx) => (
                      <tr
                        key={`${record.quotationNo}-${idx}`}
                        className="border-b border-ink-50 transition-colors hover:bg-ink-50/50"
                      >
                        <td className="px-5 py-4 font-mono text-xs font-semibold text-accent-600 whitespace-nowrap">
                          {record.quotationNo}
                        </td>
                        <td className="px-5 py-4 max-w-[220px] truncate font-medium text-ink-900" title={record.customerName}>
                          {record.customerName}
                        </td>
                        <td className="px-5 py-4 text-ink-600 whitespace-nowrap">
                          {formatDateCell(record.nextFollowupDate)}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <StatusPill value={record.followupStatus} />
                        </td>
                        <td className="px-5 py-4 max-w-[300px] truncate text-ink-600" title={record.followupRemark}>
                          {record.followupRemark || "—"}
                        </td>
                        <td className="px-5 py-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setFollowUpRecord(record)}
                            className="p-1.5 rounded-md text-green-600 hover:text-green-700 hover:bg-green-50 transition-colors cursor-pointer"
                            title="Next Follow-up"
                            aria-label={`Next Follow-up for ${record.quotationNo}`}
                          >
                            <Calendar className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-ink-50 px-6 py-4 flex-shrink-0 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-400">
            {total > 0 ? (
              <>
                Showing <span className="font-semibold text-ink-700">{pageStart}</span>–
                <span className="font-semibold text-ink-700">{pageEnd}</span> of{" "}
                <span className="font-semibold text-ink-700">{total}</span> records · Page{" "}
                <span className="font-semibold text-ink-700">{pagination?.page || 1}</span> of{" "}
                <span className="font-semibold text-ink-700">{totalPages}</span>
              </>
            ) : (
              "0 records"
            )}
          </p>

          {total > 0 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!pagination?.hasPrev}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-ink-100 px-2.5 text-xs font-semibold text-ink-600 transition-colors cursor-pointer hover:bg-ink-50 disabled:cursor-not-allowed disabled:text-ink-300 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>

              {getPageItems(pagination?.page || 1, totalPages).map((item, idx) =>
                item === "…" ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-xs text-ink-400">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    className={cn(
                      "inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors cursor-pointer",
                      item === (pagination?.page || 1)
                        ? "bg-accent-500 text-white"
                        : "text-ink-600 hover:bg-ink-50"
                    )}
                  >
                    {item}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={!pagination?.hasNext}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-ink-100 px-2.5 text-xs font-semibold text-ink-600 transition-colors cursor-pointer hover:bg-ink-50 disabled:cursor-not-allowed disabled:text-ink-300 disabled:hover:bg-transparent"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end px-6 py-4 border-t border-ink-50 flex-shrink-0">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {followUpRecord && (
        <QuotationFollowupModal
          quotationNo={followUpRecord.quotationNo}
          orderStatus={followUpRecord.orderStatus || ""}
          onClose={() => setFollowUpRecord(null)}
          onSuccess={() => {
            load(status, selectedDates, page);
            onDataChanged?.();
          }}
        />
      )}
    </div>
  );
}