"use client";

import { useState, useEffect } from "react";
import { X, Calendar, Loader2, Inbox } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

export default function TodayFollowupsModal({ isOpen, onClose, followups, loading }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 sm:p-8 overflow-y-auto">
      <div className="fixed inset-0 bg-ink-950/40 cursor-pointer" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Calendar className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent-500">
                Follow-ups
              </p>
              <h2 className="mt-0.5 text-lg font-semibold text-ink-900">Today's Follow-ups</h2>
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

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-accent-500" />
              <p className="mt-3 text-sm text-ink-400">Loading today's follow-ups...</p>
            </div>
          )}

          {!loading && !followups && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50 text-ink-400">
                <Inbox className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm text-ink-500">
                No follow-up data loaded.
              </p>
            </div>
          )}

          {!loading && followups && followups.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-50 text-accent-600">
                <Calendar className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm text-ink-500">
                No follow-ups scheduled for today.
              </p>
            </div>
          )}

          {!loading && followups && followups.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-ink-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-ink-50 border-b border-ink-100">
                    <th className="px-4 py-3 text-left font-semibold text-ink-600 whitespace-nowrap">Quotation No</th>
                    <th className="px-4 py-3 text-left font-semibold text-ink-600 whitespace-nowrap">Customer Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-ink-600 whitespace-nowrap">Next Followup Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-ink-600 whitespace-nowrap">Followup Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-ink-600 whitespace-nowrap">Followup Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {followups.map((followup, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-ink-50 transition-colors hover:bg-ink-50/50"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-accent-600 whitespace-nowrap">
                        {followup.quotationNo}
                      </td>
                      <td className="px-4 py-3 max-w-[220px] truncate font-medium text-ink-900" title={followup.customerName}>
                        {followup.customerName}
                      </td>
                      <td className="px-4 py-3 text-ink-600 whitespace-nowrap">
                        {followup.nextFollowupDate}
                      </td>
                      <td className="px-4 py-3 text-ink-600 whitespace-nowrap">
                        {followup.followupStatus}
                      </td>
                      <td className="px-4 py-3 max-w-[300px] truncate text-ink-600" title={followup.followupRemark}>
                        {followup.followupRemark}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end px-6 py-4 border-t border-ink-50 flex-shrink-0">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
