"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { filledFieldStyle } from "@/lib/utils/filledFieldStyle";

export default function SearchableDropdown({
  label,
  required,
  placeholder,
  items = [],
  value,
  onChange,
  error,
  disabled,
  loading,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const openedByFocusRef = useRef(false);

  const selectedLabel = useMemo(() => {
    if (!value) return "";
    const match = items.find((i) => i.value === value);
    return match ? match.label : value;
  }, [items, value]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (open) setHighlightIndex(-1);
  }, [open]);

  useEffect(() => {
    if (!open) openedByFocusRef.current = false;
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    if (!query) return items;
    const lower = query.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(lower) ||
        item.value.toLowerCase().includes(lower)
    );
  }, [items, query]);

  const hasValue = !!value;

  function handleInputChange(e) {
    const val = e.target.value;
    setQuery(val);
    if (!open) setOpen(true);
  }

  function handleInputClick() {
    if (openedByFocusRef.current) {
      openedByFocusRef.current = false;
      return;
    }
    setOpen((prev) => !prev);
  }

  function selectItem(item) {
    onChange(item.value);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  const handleKeyDown = useCallback(
    (e) => {
      if (!open || filtered.length === 0) {
        if (e.key === "Escape") {
          setOpen(false);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightIndex((prev) =>
            prev < filtered.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightIndex((prev) =>
            prev > 0 ? prev - 1 : filtered.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (highlightIndex >= 0 && highlightIndex < filtered.length) {
            selectItem(filtered[highlightIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          break;
      }
    },
    [open, filtered, highlightIndex]
  );

  const generatedId = useRef(
    `searchable-dropdown-${Math.random().toString(36).slice(2, 9)}`
  ).current;

  const listboxId = `${generatedId}-listbox`;

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={generatedId}
            className="text-sm font-medium text-ink-600 flex items-center gap-1"
          >
            {label}
            {required && <span className="text-danger-500">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={inputRef}
            id={generatedId}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-haspopup="listbox"
            aria-invalid={!!error}
            autoComplete={`off-${generatedId}`}
            disabled={disabled}
            className={cn(
              "h-10 w-full rounded-lg border px-3 pr-9 text-sm transition-all duration-200",
              filledFieldStyle(hasValue, !!error),
              disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            )}
            placeholder={placeholder || "Select..."}
            value={open ? query : selectedLabel}
            onChange={handleInputChange}
            onClick={handleInputClick}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (filtered.length > 0 && !open) {
                openedByFocusRef.current = true;
                setOpen(true);
              }
            }}
          />
          {loading ? (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-ink-300 border-t-transparent animate-spin" />
          ) : (
            <ChevronDown
              className={cn(
                "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-transform duration-200",
                open && "rotate-180",
                hasValue ? "text-slate-500" : "text-ink-300"
              )}
            />
          )}
        </div>
        {error ? (
          <p
            className="flex items-center gap-1 text-xs font-medium text-danger-500"
            role="alert"
          >
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {error}
          </p>
        ) : null}
      </div>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-lg border border-ink-100 bg-white shadow-card-hover max-h-60 overflow-y-auto"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-2.5 text-sm text-ink-400">No results found</li>
          ) : (
            filtered.map((item, index) => (
              <li
                key={item.value}
                role="option"
                aria-selected={index === highlightIndex}
                className={cn(
                  "flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-colors border-b border-ink-50 last:border-0",
                  index === highlightIndex
                    ? "bg-accent-50 text-accent-700"
                    : "text-ink-700 hover:bg-accent-50 hover:text-accent-700",
                  item.value === value && !open && "font-semibold"
                )}
                onMouseEnter={() => setHighlightIndex(index)}
                onMouseDown={() => selectItem(item)}
              >
                <span className="font-medium">{item.label}</span>
                {item.value === value && (
                  <span className="text-xs text-accent-500">Selected</span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
