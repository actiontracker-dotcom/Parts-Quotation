"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { filledFieldStyle } from "@/lib/utils/filledFieldStyle";

export default function AutocompleteInput({
  label,
  required,
  placeholder,
  value,
  onChange,
  onSelect,
  fetchSuggestions,
  error,
  debounceMs = 300,
  minChars = 3,
  maxSuggestions = 10,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const abortRef = useRef(null);
  const lastQueryRef = useRef("");
  const requestSeqRef = useRef(0);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
        setHighlightIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  function cancelPending() {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }

  async function runSearch(rawQuery) {
    const query = rawQuery.trim();
    if (!query) return;

    if (query === lastQueryRef.current) return;
    lastQueryRef.current = query;

    cancelPending();

    const seq = ++requestSeqRef.current;
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const results = await fetchSuggestions(query, {
        signal: controller.signal,
      });
      if (seq !== requestSeqRef.current || controller.signal.aborted) return;

      const sliced = results.slice(0, maxSuggestions);
      setSuggestions(sliced);
      setShowDropdown(true);
      setHighlightIndex(-1);
    } catch (err) {
      if (seq !== requestSeqRef.current) return;
      if (err && err.name === "AbortError") return;
      lastQueryRef.current = "";
      setSuggestions([]);
      setShowDropdown(true);
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  }

  function handleChange(e) {
    const val = e.target.value;
    onChange(val);
    setHighlightIndex(-1);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    const trimmed = val.trim();
    if (trimmed.length < minChars) {
      cancelPending();
      lastQueryRef.current = "";
      setSuggestions([]);
      setShowDropdown(false);
      setLoading(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      runSearch(val);
    }, debounceMs);
  }

  function handleKeyDown(e) {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === "Escape") {
        setShowDropdown(false);
        setHighlightIndex(-1);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
          selectSuggestion(suggestions[highlightIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowDropdown(false);
        setHighlightIndex(-1);
        break;
    }
  }

  function selectSuggestion(item) {
    cancelPending();
    lastQueryRef.current = "";
    onSelect(item);
    setSuggestions([]);
    setShowDropdown(false);
    setHighlightIndex(-1);
  }

  const generatedId = useRef(
    `autocomplete-${Math.random().toString(36).slice(2, 9)}`
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
          <Search
            className={cn(
              "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors",
              value ? "text-slate-500" : "text-ink-300"
            )}
          />
          <input
            id={generatedId}
            type="text"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-invalid={!!error}
            autoComplete={`off-${generatedId}`}
            className={cn(
              "h-10 w-full rounded-lg border pl-9 pr-3 text-sm placeholder:text-ink-300 transition-all duration-200 cursor-pointer",
              filledFieldStyle(!!value, !!error)
            )}
            placeholder={placeholder || "Search..."}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) setShowDropdown(true);
            }}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-300" />
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

      {showDropdown && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-lg border border-ink-100 bg-white shadow-card-hover max-h-60 overflow-y-auto"
        >
          {suggestions.length === 0 ? (
            <li className="px-4 py-2.5 text-sm text-ink-400">
              {loading ? "Searching..." : "No matches found"}
            </li>
          ) : (
            suggestions.map((item, index) => (
              <li
                key={item._id || index}
                role="option"
                aria-selected={index === highlightIndex}
                className={cn(
                  "flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-colors border-b border-ink-50 last:border-0",
                  index === highlightIndex
                    ? "bg-accent-50 text-accent-700"
                    : "text-ink-700 hover:bg-accent-50 hover:text-accent-700"
                )}
                onMouseEnter={() => setHighlightIndex(index)}
                onMouseDown={() => selectSuggestion(item)}
              >
                <span className="font-medium">{item.customerName}</span>
                {item.stateName && (
                  <span className="ml-2 text-xs text-ink-400 flex-shrink-0">
                    {item.stateName}
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
