// Shared, dependency-free date helpers used by the dashboard API (server-side
// aggregation) and the dashboard UI (client-side preset date ranges). Both must
// agree on parsing so filter results are identical everywhere.

// ─── CANONICAL DATE FORMAT ─────────────────────────────────────────────────────────
// The entire application uses DD/MM/YYYY as the canonical date format.
// This is the format used for:
// - React state (after normalization from HTML date input)
// - API requests/responses
// - Google Sheets writes
// - Google Sheets read-back (normalized from legacy formats)
// - Verification comparisons
// - Display/PDF

/**
 * Normalizes a date value to the canonical DD/MM/YYYY format.
 * Handles multiple input formats:
 * - YYYY-MM-DD (HTML date input format)
 * - DD/MM/YYYY (canonical format)
 * - DD-MM-YYYY (legacy format)
 * - Date-like Google Sheet values
 * Returns empty string for null/undefined/blank values.
 */
export function normalizeToCanonicalDate(value) {
  if (value === null || value === undefined) return "";
  const s = String(value).trim();
  if (!s) return "";

  // Already in canonical format DD/MM/YYYY
  const canonical = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (canonical) {
    const [, d, m, y] = canonical.map(Number);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const paddedD = String(d).padStart(2, "0");
      const paddedM = String(m).padStart(2, "0");
      return `${paddedD}/${paddedM}/${y}`;
    }
  }

  // YYYY-MM-DD (HTML date input format) - convert to DD/MM/YYYY
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, y, m, d] = iso.map(Number);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const paddedD = String(d).padStart(2, "0");
      const paddedM = String(m).padStart(2, "0");
      return `${paddedD}/${paddedM}/${y}`;
    }
  }

  // DD-MM-YYYY (legacy format) - convert to DD/MM/YYYY
  const dmyDash = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmyDash) {
    const [, d, m, y] = dmyDash.map(Number);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const paddedD = String(d).padStart(2, "0");
      const paddedM = String(m).padStart(2, "0");
      return `${paddedD}/${paddedM}/${y}`;
    }
  }

  // If already in DD/MM/YYYY format but not matched above, return as-is
  if (s.includes("/") && s.split("/").length === 3) {
    return s;
  }

  // Fallback: return original value if cannot normalize
  return s;
}

/**
 * Converts HTML date input value (YYYY-MM-DD) to canonical format (DD/MM/YYYY).
 * This is used at the frontend input boundary.
 */
export function fromDateInputToCanonical(value) {
  if (!value) return "";
  const s = String(value).trim();
  if (!s) return "";
  
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, y, m, d] = iso.map(Number);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const paddedD = String(d).padStart(2, "0");
      const paddedM = String(m).padStart(2, "0");
      return `${paddedD}/${paddedM}/${y}`;
    }
  }
  
  // If not in YYYY-MM-DD format, try to normalize it
  return normalizeToCanonicalDate(s);
}

/**
 * Converts canonical format (DD/MM/YYYY) to HTML date input value (YYYY-MM-DD).
 * This is used when populating date inputs from canonical state.
 */
export function fromCanonicalToDateInput(value) {
  if (!value) return "";
  const s = String(value).trim();
  if (!s) return "";
  
  const canonical = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (canonical) {
    const [, d, m, y] = canonical.map(Number);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const paddedM = String(m).padStart(2, "0");
      const paddedD = String(d).padStart(2, "0");
      return `${y}-${paddedM}-${paddedD}`;
    }
  }
  
  // If not in canonical format, return as-is (let browser handle it)
  return s;
}

// Robust local-calendar parser for the "Quotation Date" field. Handles the
// YYYY-MM-DD value written by the date input plus common legacy formats that
// may already exist in the sheet (DD/MM/YYYY, DD-MM-YYYY). Returns null when
// the value cannot be interpreted so filters degrade gracefully instead of
// throwing.
export function parseQuotationDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, y, m, d] = iso.map(Number);
    return new Date(y, m - 1, d);
  }

  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy.map(Number);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const parsed = new Date(y, m - 1, d);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return null;
  }

  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toDateKey(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Monday as the first day of the week, matching the existing app's chart week.
export function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Sunday -> back 6, else back to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ISO week number (1-53) for the supplied date.
export function isoWeekInfo(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

export function diffDays(a, b) {
  const ms = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return Math.floor(ms / 86400000);
}

// Last date included in a range (end-of-day boundary for <=/>= comparisons).
export function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}