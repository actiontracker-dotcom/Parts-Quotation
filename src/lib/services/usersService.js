// Server-only reader for the "Users" sheet.
//
// The Users sheet is managed separately (Google Apps Script) with exactly these
// headers:
//   Username | Password | Active
//
// Passwords are read ONLY here, server-side, for the plain-text login comparison
// (testing only). The password is never returned to any client, never included
// in any API response, and never logged.
//
// Each call reads the sheet fresh so newly added user rows take effect
// immediately (no stale cache to invalidate).

import { readSheetRange } from "./googleSheetsClient.js";

const USERS_SHEET_TAB = "Users";

function buildHeaderMap(headerRow) {
  const map = {};
  if (!headerRow) return map;
  headerRow.forEach((header, idx) => {
    const key = String(header).trim();
    if (key && !(key in map)) {
      map[key] = idx;
    }
  });
  return map;
}

function getCellValue(row, headerMap, headerName) {
  const idx = headerMap[headerName];
  if (idx === undefined || idx >= row.length) return "";
  const val = row[idx];
  return val === undefined || val === null ? "" : String(val).trim();
}

function parseActive(value) {
  if (typeof value === "boolean") return value;
  const s = String(value || "").trim().toUpperCase();
  return s === "TRUE" || s === "YES" || s === "1";
}

// Returns [{ username, password, active }]. Returns [] (never throws) when the
// sheet is missing, headers are absent, or the read fails, so login degrades
// gracefully instead of crashing.
export async function getUsers() {
  try {
    const rows = await readSheetRange(USERS_SHEET_TAB, null);
    if (!rows || rows.length < 2) return [];

    const headers = buildHeaderMap(rows[0]);
    const users = [];

    for (const row of rows.slice(1)) {
      const username = getCellValue(row, headers, "Username");
      if (!username) continue;

      users.push({
        username,
        password: getCellValue(row, headers, "Password"),
        active: parseActive(getCellValue(row, headers, "Active")),
      });
    }

    return users;
  } catch (error) {
    console.warn("[usersService] Failed to read Users sheet:", error.message);
    return [];
  }
}