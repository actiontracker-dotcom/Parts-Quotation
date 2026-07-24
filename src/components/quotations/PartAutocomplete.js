"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { filledFieldStyle } from "@/lib/utils/filledFieldStyle";

const searchCache = new Map();
const MAX_CACHE_SIZE = 100;

function setCache(key, value) {
  if (searchCache.size >= MAX_CACHE_SIZE) {
    const first = searchCache.keys().next().value;
    searchCache.delete(first);
  }
  searchCache.set(key, value);
}

function getCached(query) {
  const q = query.toLowerCase();
  return searchCache.has(q) ? searchCache.get(q) : null;
}

export default function PartAutocomplete({
  label,
  required,
  placeholder,
  value,
  onChange,
  onSelect,
  error,
  debounceMs = 300,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const timerRef = useRef(null);
  const abortRef = useRef(null);

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

  function doSearch(query) {
    if (abortRef.current) abortRef.current.abort();
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      setShowDropdown(false);
      setLoading(false);
      return;
    }

    const cached = getCached(trimmed);
    if (cached) {
      setSuggestions(cached);
      setShowDropdown(cached.length > 0);
      setHighlightIndex(-1);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    fetch(`/api/parts/search?q=${encodeURIComponent(trimmed)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setCache(trimmed.toLowerCase(), json.data);
          setSuggestions(json.data);
          setShowDropdown(json.data.length > 0);
          setHighlightIndex(-1);
        } else {
          setSuggestions([]);
          setShowDropdown(false);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  function selectSuggestion(item) {
    onSelect(item);
    setSuggestions([]);
    setShowDropdown(false);
    setHighlightIndex(-1);
  }

  function handleChange(e) {
    const val = e.target.value;
    onChange(val);

    if (timerRef.current) clearTimeout(timerRef.current);

    if (!val.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      setLoading(false);
      return;
    }

    timerRef.current = setTimeout(() => doSearch(val), debounceMs);
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

  function highlightMatch(text, query) {
    if (!query || !text) return text;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const idx = lowerText.indexOf(lowerQuery);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span style={{ backgroundColor: "#fef3c7", fontWeight: 700 }}>{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </>
    );
  }

  const generatedId = useRef(
    `part-autocomplete-${Math.random().toString(36).slice(2, 9)}`
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
          <Search className={cn("pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors", value ? "text-slate-500" : "text-ink-300")} />
          <input
            ref={inputRef}
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
            placeholder={placeholder || "Search part number..."}
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

      {showDropdown && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          style={{ width: wrapperRef.current?.offsetWidth }}
          className="absolute z-50 mt-1 bg-white rounded-xl shadow-lg max-h-[300px] overflow-y-auto"
        >
          {suggestions.map((item, index) => (
            <li
              key={item._id || index}
              role="option"
              aria-selected={index === highlightIndex}
              className={cn(
                "h-12 px-4 flex items-center cursor-pointer border-b border-gray-200 last:border-b-0 transition-colors duration-150",
                index === highlightIndex ? "bg-accent-50" : "hover:bg-accent-50"
              )}
              onMouseEnter={() => setHighlightIndex(index)}
              onMouseDown={() => selectSuggestion(item)}
              onMouseMove={() => {
                if (highlightIndex !== index) setHighlightIndex(index);
              }}
            >
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#1f2937",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {highlightMatch(item.partNo, value)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
