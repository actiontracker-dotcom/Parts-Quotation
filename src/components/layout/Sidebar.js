"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { FileText, History, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { label: "Quotations", href: "/quotations", icon: FileText },
  { label: "Follow-ups", href: "/followups", icon: History },
];

export default function Sidebar({ open, onClose }) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <button
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-ink-950/40 lg:hidden cursor-pointer"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-ink-900 text-ink-100 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-5 py-6">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Company Logo"
              width={28}
              height={28}
              className="object-contain"
            />
            <div>
              <p className="font-display text-sm font-semibold leading-none text-white">
                Quotation
              </p>
              <p className="text-xs leading-none text-ink-300 mt-1">Manager</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-ink-300 hover:bg-ink-800 hover:text-white lg:hidden cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent-500 text-white shadow-card"
                    : "text-ink-200 hover:bg-ink-800 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
