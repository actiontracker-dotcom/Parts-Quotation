import { readSheetRange, appendSheetRows, updateSheetRow, clearSheetRange, prewarmAuth } from "./googleSheetsClient.js";
import { toNumber, computeLineTotal, computeGstAmount } from "../utils/formatters.js";
import { DEFAULT_UOM, DEFAULT_GST_RATE } from "../constants/quotationOptions.js";

const CUSTOMER_SHEET_TAB = "Mastersheet";
const PARTS_SHEET_TAB = "Products";
const DATA_SHEET_TAB = "Data";
const FOLLOWUP_FORM_SHEET_TAB = "Followup Form for Quotation";

// ─── GOOGLE SHEET DATE/TIMESTAMP WRITE FORMATTING ─────────────────────────────
// Values are written to Google Sheets as fixed TEXT so the sheet always shows
// the intended calendar date/time regardless of the spreadsheet locale:
//   - dates:      DD/MM/YYYY
//   - timestamps: DD/MM/YYYY HH:mm:ss (Asia/Kolkata)
// These helpers are applied ONLY at the write boundary; read parsing is
// untouched.

const SHEET_DATE_PAD = (n) => String(n).padStart(2, "0");

const SHEET_IST_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function parseSheetDateInput(value) {
  const s = String(value).trim();
  if (!s) return null;

  // YYYY-MM-DD (HTML date-input value). Parsed component-wise so a server
  // running in a non-UTC timezone never shifts the calendar day by one.
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})([ T].*)?$/);
  if (iso) {
    const [, y, m, d] = iso.map(Number);
    return new Date(y, m - 1, d);
  }

  // DD/MM/YYYY or DD-MM-YYYY (already formatted / legacy sheet values).
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy.map(Number);
    return new Date(y, m - 1, d);
  }

  // Legacy "D-Mon-YY" style (e.g. "1-Aug-25") used by older Price (w.e.f) values.
  const mon = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{2,4})$/);
  if (mon) {
    const MONTHS = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    };
    const m = MONTHS[mon[2].slice(0, 3).toLowerCase()];
    if (m) {
      const yRaw = Number(mon[3]);
      const y = yRaw < 100 ? 2000 + yRaw : yRaw;
      return new Date(y, m - 1, Number(mon[1]));
    }
  }

  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Interprets a value as an instant. Already-formatted "DD/MM/YYYY HH:mm:ss"
// values are treated as Asia/Kolkata wall-clock (IST is UTC+05:30, no DST) so
// re-saving existing rows round-trips without drifting.
function parseTimestampInput(value) {
  const dmy = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
  if (dmy) {
    const [, d, m, y, h, mi, se] = dmy.map(Number);
    return new Date(Date.UTC(y, m - 1, d, h, mi, se) - 5.5 * 3600 * 1000);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toSheetDate(value) {
  if (value === undefined || value === null) return "";
  const s = String(value).trim();
  if (!s) return "";
  const date = parseSheetDateInput(s);
  if (!date) return s;
  return `${SHEET_DATE_PAD(date.getDate())}/${SHEET_DATE_PAD(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function toSheetTimestamp(value) {
  if (value === undefined || value === null) return "";
  const s = String(value).trim();
  if (!s) return "";
  const date = parseTimestampInput(s);
  if (!date) return s;
  const parts = {};
  for (const p of SHEET_IST_FORMATTER.formatToParts(date)) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`;
}

// ─── LOW-LEVEL SHEET I/O ───────────────────────────────────────────────────────
// Implemented in googleSheetsClient.js — imported above.

// ─── HEADER MAP HELPERS ────────────────────────────────────────────────────────

function buildHeaderMap(headerRow) {
  const map = {};
  const seen = {};
  if (headerRow) {
    headerRow.forEach((header, idx) => {
      const key = header.trim();
      seen[key] = (seen[key] || 0) + 1;
      if (seen[key] === 1) {
        map[key] = idx;
      } else {
        map[`${key} #${seen[key]}`] = idx;
      }
    });
  }
  return map;
}

function getCellValue(row, headerMap, headerName) {
  const idx = headerMap[headerName];
  if (idx === undefined || idx >= row.length) return "";
  const val = row[idx];
  return (val === undefined || val === null) ? "" : String(val).trim();
}

function getCellNum(row, headerMap, headerName) {
  const idx = headerMap[headerName];
  if (idx === undefined || idx >= row.length) return 0;
  const val = row[idx];
  if (val === undefined || val === null || val === "") return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function getColumnLetter(index) {
  let letter = "";
  let n = index;
  while (n >= 0) {
    letter = String.fromCharCode(65 + (n % 26)) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

function validateHeaders(expectedHeaders, actualHeaders, sheetName) {
  const missing = expectedHeaders.filter((h) => !(h in actualHeaders));
  if (missing.length > 0) {
    console.warn(
      `[googleSheetsService] Sheet "${sheetName}" is missing expected headers: ${missing.join(", ")}. ` +
      `Available headers: ${Object.keys(actualHeaders).join(", ")}`
    );
  }
}

// ─── CACHE ─────────────────────────────────────────────────────────────────────

let customersCache = null;
let customersHeaders = null;
let customersLoadPromise = null;

let partsCache = null;
let partsHeaders = null;
let partsLoadPromise = null;

let customerHistoryCache = null;
let customerHistoryLoadPromise = null;

let dataHeadersCache = null;
let dataHeadersLoadPromise = null;

// ─── CROSS-INSTANCE CACHE SHARING ───────────────────────────────────────────────
// Next.js gives each route handler its own module instance in dev (webpack).
// We use globalThis to share the loaded cache across all instances,
// preventing redundant Google Sheets API calls.

function restoreGlobalCache() {
  if (typeof globalThis === "undefined") return false;
  const sc = globalThis.__sheetsCache;
  if (!sc) return false;
  let restored = false;
  if (sc.customers && !customersCache) {
    customersCache = sc.customers.cache;
    customersHeaders = sc.customers.headers;
    restored = true;
  }
  if (sc.parts && !partsCache) {
    partsCache = sc.parts.cache;
    partsHeaders = sc.parts.headers;
    restored = true;
  }
  if (sc.dataHeaders && !dataHeadersCache) {
    dataHeadersCache = sc.dataHeaders;
    restored = true;
  }
  if (sc.customerHistory && !customerHistoryCache) {
    customerHistoryCache = sc.customerHistory;
    restored = true;
  }
  return restored;
}

function storeGlobalCache() {
  if (typeof globalThis === "undefined") return;
  globalThis.__sheetsCache = {
    customers: customersCache ? { cache: customersCache, headers: customersHeaders } : undefined,
    parts: partsCache ? { cache: partsCache, headers: partsHeaders } : undefined,
    dataHeaders: dataHeadersCache || undefined,
    customerHistory: customerHistoryCache || undefined,
  };
}

function getGlobalLoading(key) {
  if (typeof globalThis === "undefined") return null;
  if (!globalThis.__sheetsLoading) return null;
  return globalThis.__sheetsLoading[key] || null;
}

function setGlobalLoading(key, promise) {
  if (typeof globalThis === "undefined") return;
  if (!globalThis.__sheetsLoading) globalThis.__sheetsLoading = {};
  globalThis.__sheetsLoading[key] = promise;
}

// Restore caches preloaded by server.mjs in production
restoreGlobalCache();

const EXPECTED_CUSTOMER_HEADERS = [
  "Customer Name",
  "Full Address/GST NO.",
  "Full Address",
  "GST NO.",
  "State Name",
  "State code",
];

const EXPECTED_PARTS_HEADERS = [
  "Parts No",
  "Description",
  "Group",
  "Sub Group",
  "A RAIPUR",
  "B RAIGARH",
  "C AMBIKAPUR",
  "D SATNA",
  "Last Purchase Date",
  "Applicable Date",
  "Standard Rate",
  "Location A RAIPUR",
  "Location B RAIGARH",
  "Location C AMBIKAPUR",
  "Location D SATNA",
  "Raipur Stock Value",
  "Raigarh Stock Value",
  "Ambikapur Stock Value",
  "Satna Stock Value",
  "Stock Status",
  "Low Stock",
  "Out of Stock",
  "In Stock",
  "Minimum Qty",
  "Pending Order In HO",
  "Need to Order",
  "Status",
  "HSN Code",
  "Total Qty",
  "Total Price",
  "Part No",
];

async function ensureCustomersLoaded() {
  if (customersCache) return;

  if (restoreGlobalCache() && customersCache) return;

  const globalLoading = getGlobalLoading("customers");
  if (globalLoading) {
    await globalLoading;
    restoreGlobalCache();
    return;
  }

  if (customersLoadPromise) return customersLoadPromise;

  customersLoadPromise = (async () => {
    console.time("sheets-load-customers-total");

    console.time("sheets-load-customers-api");
    const rows = await readSheetRange(CUSTOMER_SHEET_TAB, null);
    console.timeEnd("sheets-load-customers-api");

    if (!rows || rows.length < 2) {
      customersCache = [];
      customersHeaders = {};
      console.timeEnd("sheets-load-customers-total");
      return;
    }

    console.time("sheets-load-customers-process");
    customersHeaders = buildHeaderMap(rows[0]);
    validateHeaders(EXPECTED_CUSTOMER_HEADERS, customersHeaders, CUSTOMER_SHEET_TAB);

    customersCache = rows.slice(1).map((row, i) => ({
      _id: `row-${i}`,
      customerName: getCellValue(row, customersHeaders, "Customer Name"),
      fullAddressWithGST: getCellValue(row, customersHeaders, "Full Address/GST NO."),
      fullAddress: getCellValue(row, customersHeaders, "Full Address"),
      gstNo: getCellValue(row, customersHeaders, "GST NO."),
      stateName: getCellValue(row, customersHeaders, "State Name"),
      stateCode: getCellValue(row, customersHeaders, "State code"),
    }));
    console.timeEnd("sheets-load-customers-process");
    console.timeEnd("sheets-load-customers-total");

    storeGlobalCache();
  })();

  setGlobalLoading("customers", customersLoadPromise);

  try {
    await customersLoadPromise;
  } finally {
    customersLoadPromise = null;
    setGlobalLoading("customers", null);
  }
}

// ─── CUSTOMER HISTORY (Data-sheet fallback) ──────────────────────────────
// The customer master tab ("Mastersheet") only holds six columns. Contact and
// extended attributes live in the history tab ("Data"). To auto-fill a form
// with the fullest possible picture of a customer, we index the latest row
// per customer name from DATA and merge it into the master row, filling only
// the fields the master does not provide. The history is indexed once and
// cached exactly like the customer/part masters.

const CUSTOMER_HISTORY_COLUMN_MAP = {
  fullAddressWithGST: "Full Address with GST",
  fullAddress: "Full Address",
  gstNo: "GST NO.#",
  stateName: "State Name",
  stateCode: "State Code",
  contactPerson: "Contact Person",
  contactNumber: "Contact Number",
  designation: "Designation",
  email: "Email Id To",
  emailCc: "Email CC",
  location: "Location",
  userId: "User ID",
  engineerRemark: "Engineer Remark",
};

function customerHistoryTime(raw) {
  if (!raw) return -1;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? -1 : parsed.getTime();
}

function isNewerCustomerHistoryEntry(candidate, current) {
  return (
    customerHistoryTime(candidate.quotationDate || candidate.timestamp) >
    customerHistoryTime(current.quotationDate || current.timestamp)
  );
}

async function ensureCustomerHistoryLoaded() {
  if (customerHistoryCache) return;

  if (restoreGlobalCache() && customerHistoryCache) return;

  const globalLoading = getGlobalLoading("customerHistory");
  if (globalLoading) {
    await globalLoading;
    restoreGlobalCache();
    return;
  }

  if (customerHistoryLoadPromise) return customerHistoryLoadPromise;

  customerHistoryLoadPromise = (async () => {
    console.time("sheets-load-customer-history");
    const rows = await readSheetRange(DATA_SHEET_TAB, null);

    const headers =
      rows && rows.length ? buildHeaderMap(rows[0]) : buildHeaderMap(DATA_SHEET_HEADERS);
    const map = new Map();

    for (const row of (rows || []).slice(1)) {
      const name = getCellValue(row, headers, "Customer Name");
      if (!name) continue;

      const entry = {
        quotationDate: getCellValue(row, headers, "Quotation Date"),
        timestamp: getCellValue(row, headers, "Timestamp"),
      };
      for (const field of Object.keys(CUSTOMER_HISTORY_COLUMN_MAP)) {
        entry[field] = getCellValue(row, headers, CUSTOMER_HISTORY_COLUMN_MAP[field]);
      }

      const key = name.trim().toLowerCase();
      const existing = map.get(key);
      if (!existing || isNewerCustomerHistoryEntry(entry, existing)) {
        map.set(key, entry);
      }
    }

    customerHistoryCache = map;
    console.timeEnd("sheets-load-customer-history");
    storeGlobalCache();
  })();

  setGlobalLoading("customerHistory", customerHistoryLoadPromise);

  try {
    await customerHistoryLoadPromise;
  } finally {
    customerHistoryLoadPromise = null;
    setGlobalLoading("customerHistory", null);
  }
}

function mergeCustomerHistory(customer) {
  const merged = { ...customer };
  if (!customerHistoryCache || customerHistoryCache.size === 0) return merged;

  const key = (customer.customerName || "").trim().toLowerCase();
  const history = customerHistoryCache.get(key);
  if (!history) return merged;

  for (const field of Object.keys(CUSTOMER_HISTORY_COLUMN_MAP)) {
    const hasValue =
      merged[field] !== undefined &&
      merged[field] !== null &&
      String(merged[field]).trim() !== "";
    if (hasValue) continue;

    const fallback = history[field];
    if (fallback !== undefined && fallback !== null && String(fallback).trim() !== "") {
      merged[field] = fallback;
    }
  }
  return merged;
}

async function ensurePartsLoaded() {
  if (partsCache) return;

  if (restoreGlobalCache() && partsCache) return;

  const globalLoading = getGlobalLoading("parts");
  if (globalLoading) {
    await globalLoading;
    restoreGlobalCache();
    return;
  }

  if (partsLoadPromise) return partsLoadPromise;

  partsLoadPromise = (async () => {
    console.time("sheets-load-parts-total");

    console.time("sheets-load-parts-api");
    const rows = await readSheetRange(PARTS_SHEET_TAB, null);
    console.timeEnd("sheets-load-parts-api");

    if (!rows || rows.length < 2) {
      partsCache = [];
      partsHeaders = {};
      console.timeEnd("sheets-load-parts-total");
      return;
    }

    console.time("sheets-load-parts-process");
    partsHeaders = buildHeaderMap(rows[0]);
    validateHeaders(EXPECTED_PARTS_HEADERS, partsHeaders, PARTS_SHEET_TAB);

    partsCache = rows.slice(1).map((row, i) => ({
      _id: `row-${i}`,
      partNo: getCellValue(row, partsHeaders, "Parts No"),
      description: getCellValue(row, partsHeaders, "Description"),
      group: getCellValue(row, partsHeaders, "Group"),
      subGroup: getCellValue(row, partsHeaders, "Sub Group"),
      aRaipur: getCellNum(row, partsHeaders, "A RAIPUR"),
      bRaigarh: getCellNum(row, partsHeaders, "B RAIGARH"),
      cAmbikapur: getCellNum(row, partsHeaders, "C AMBIKAPUR"),
      dSatna: getCellNum(row, partsHeaders, "D SATNA"),
      lastPurchaseDate: getCellValue(row, partsHeaders, "Last Purchase Date"),
      applicableDate: getCellValue(row, partsHeaders, "Applicable Date"),
      standardRate: getCellNum(row, partsHeaders, "Standard Rate"),
      locationRaipur: getCellValue(row, partsHeaders, "Location A RAIPUR"),
      locationRaigarh: getCellValue(row, partsHeaders, "Location B RAIGARH"),
      locationAmbikapur: getCellValue(row, partsHeaders, "Location C AMBIKAPUR"),
      locationSatna: getCellValue(row, partsHeaders, "Location D SATNA"),
      raipurStockValue: getCellNum(row, partsHeaders, "Raipur Stock Value"),
      raigarhStockValue: getCellNum(row, partsHeaders, "Raigarh Stock Value"),
      ambikapurStockValue: getCellNum(row, partsHeaders, "Ambikapur Stock Value"),
      satnaStockValue: getCellNum(row, partsHeaders, "Satna Stock Value"),
      stockStatus: getCellValue(row, partsHeaders, "Stock Status"),
      lowStock: getCellNum(row, partsHeaders, "Low Stock"),
      outOfStock: getCellNum(row, partsHeaders, "Out of Stock"),
      inStock: getCellNum(row, partsHeaders, "In Stock"),
      minimumQty: getCellNum(row, partsHeaders, "Minimum Qty"),
      pendingOrderInHO: getCellNum(row, partsHeaders, "Pending Order In HO"),
      needToOrder: getCellNum(row, partsHeaders, "Need to Order"),
      status: getCellValue(row, partsHeaders, "Status"),
      hsnCode: getCellValue(row, partsHeaders, "HSN Code"),
      totalQty: getCellNum(row, partsHeaders, "Total Qty"),
      totalPrice: getCellNum(row, partsHeaders, "Total Price"),
    }));
    console.timeEnd("sheets-load-parts-process");
    console.timeEnd("sheets-load-parts-total");

    storeGlobalCache();
  })();

  setGlobalLoading("parts", partsLoadPromise);

  try {
    await partsLoadPromise;
  } finally {
    partsLoadPromise = null;
    setGlobalLoading("parts", null);
  }
}

function invalidateCustomersCache() {
  customersCache = null;
  customersHeaders = null;
  if (typeof globalThis !== "undefined" && globalThis.__sheetsCache) {
    globalThis.__sheetsCache.customers = undefined;
  }
}

function invalidatePartsCache() {
  partsCache = null;
  partsHeaders = null;
  if (typeof globalThis !== "undefined" && globalThis.__sheetsCache) {
    globalThis.__sheetsCache.parts = undefined;
  }
}

// ─── WARM-UP ────────────────────────────────────────────────────────────────────
// Start loading caches in the background as soon as this module is imported.
// This ensures the first user request rarely blocks on a cold sheet read.

let warmupStarted = false;

function startWarmup() {
  if (warmupStarted) return;
  warmupStarted = true;
  prewarmAuth().catch(() => {});
  ensureCustomersLoaded().catch(() => {});
  ensurePartsLoaded().catch(() => {});
}

startWarmup();

// Explicit entry-point for server.mjs — preloads every cache at server
// startup so the first user request never blocks on Google Sheets I/O.
export async function preloadAll() {
  console.log("[googleSheetsService] Preloading all caches at startup...");
  const start = Date.now();
  await Promise.all([
    prewarmAuth(),
    ensureCustomersLoaded(),
    ensureCustomerHistoryLoaded(),
    ensurePartsLoaded(),
    ensureDataHeadersLoaded(),
  ]);
  console.log(`[googleSheetsService] All caches loaded in ${Date.now() - start}ms`);

  // Share caches so the webpack-bundled module instance (route handlers)
  // can pick them up immediately without another Google Sheets call.
  if (typeof globalThis !== "undefined") {
    globalThis.__sheetsCache = {
      customers: customersCache ? { cache: customersCache, headers: customersHeaders } : undefined,
      parts: partsCache ? { cache: partsCache, headers: partsHeaders } : undefined,
    };
  }
}

// ─── CUSTOMER OPERATIONS ───────────────────────────────────────────────────────

export async function getAllCustomers() {
  await ensureCustomersLoaded();
  return customersCache;
}

const MAX_CUSTOMER_SEARCH_RESULTS = 25;

export async function searchCustomers(query) {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();
  await ensureCustomersLoaded();
  await ensureCustomerHistoryLoaded();

  console.time("search-customers");

  const results = [];
  for (const c of customersCache) {
    const name = (c.customerName || "").toLowerCase();
    const gst = (c.gstNo || "").toLowerCase();
    if (!name.includes(q) && !gst.includes(q)) continue;
    const key = name || gst;
    results.push({
      customer: c,
      rank: key.startsWith(q) ? 0 : 1,
      length: key.length,
      sortKey: key,
    });
  }

  results.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (a.length !== b.length) return a.length - b.length;
    return a.sortKey.localeCompare(b.sortKey);
  });

  console.timeEnd("search-customers");

  return results
    .slice(0, MAX_CUSTOMER_SEARCH_RESULTS)
    .map((r) => mergeCustomerHistory(r.customer));
}

export async function getCustomerByRowIndex(index) {
  await ensureCustomersLoaded();
  return customersCache[index] || null;
}

function customerToRowArray(data, headers) {
  const row = new Array(Object.keys(headers).length).fill("");

  const fieldMap = {
    customerName: "Customer Name",
    fullAddressWithGST: "Full Address/GST NO.",
    fullAddress: "Full Address",
    gstNo: "GST NO.",
    stateName: "State Name",
    stateCode: "State code",
  };

  for (const [field, header] of Object.entries(fieldMap)) {
    const idx = headers[header];
    if (idx !== undefined) {
      row[idx] = data[field] || "";
    }
  }

  return row;
}

export async function createCustomer(data) {
  await ensureCustomersLoaded();
  const row = customerToRowArray(data, customersHeaders);
  await appendSheetRows(CUSTOMER_SHEET_TAB, [row]);

  const entry = {
    _id: `row-${customersCache.length}`,
    customerName: data.customerName || "",
    fullAddressWithGST: data.fullAddressWithGST || "",
    fullAddress: data.fullAddress || "",
    gstNo: data.gstNo || "",
    stateName: data.stateName || "",
    stateCode: data.stateCode || "",
  };
  customersCache.push(entry);
  storeGlobalCache();

  return entry;
}

export async function updateCustomerByRowIndex(index, data) {
  await ensureCustomersLoaded();
  const existing = customersCache[index];
  if (!existing) return null;

  const updated = { ...existing, ...data };
  const row = customerToRowArray(updated, customersHeaders);
  const numCols = Object.keys(customersHeaders).length;
  const lastCol = getColumnLetter(numCols - 1);
  const sheetRow = index + 2;

  await updateSheetRow(CUSTOMER_SHEET_TAB, `A${sheetRow}:${lastCol}${sheetRow}`, [row]);

  customersCache[index] = updated;
  storeGlobalCache();

  return updated;
}

export async function deleteCustomerByRowIndex(index) {
  await ensureCustomersLoaded();
  const existing = customersCache[index];
  if (!existing) return false;

  const numCols = Object.keys(customersHeaders).length;
  const lastCol = getColumnLetter(numCols - 1);
  const sheetRow = index + 2;

  await clearSheetRange(CUSTOMER_SHEET_TAB, `A${sheetRow}:${lastCol}${sheetRow}`);

  customersCache[index] = {
    _id: `row-${index}`,
    customerName: "",
    fullAddressWithGST: "",
    fullAddress: "",
    gstNo: "",
    stateName: "",
    stateCode: "",
  };
  storeGlobalCache();
  return true;
}

// ─── PART OPERATIONS ───────────────────────────────────────────────────────────

export async function getAllParts() {
  await ensurePartsLoaded();
  return partsCache;
}

const MAX_SEARCH_RESULTS = 100;

export async function searchParts(query) {
  if (!query || !query.trim()) return [];
  const q = query.trim();
  const qLower = q.toLowerCase();
  const qNormalized = qLower.replace(/\s+/g, "");
  await ensurePartsLoaded();

  const start = Date.now();
  const cacheSize = partsCache.length;
  const results = [];

  for (const p of partsCache) {
    const partNoLower = (p.partNo || "").toLowerCase();
    const partNoNormalized = partNoLower.replace(/\s+/g, "");
    if (partNoNormalized.startsWith(qNormalized)) {
      results.push(p);
      if (results.length >= MAX_SEARCH_RESULTS) break;
    }
  }

  console.log(`Query: ${q}`);
  console.log(`Cache: ${cacheSize}`);
  console.log(`Matches: ${results.length}`);
  console.log(`Returned: ${results.length}`);
  console.log(`Search: ${Date.now() - start}ms`);

  return results;
}

export async function getPartByRowIndex(index) {
  await ensurePartsLoaded();
  return partsCache[index] || null;
}

function partToRowArray(data, headers) {
  const row = new Array(Object.keys(headers).length).fill("");

  const fieldMap = {
    partNo: "Parts No",
    description: "Description",
    group: "Group",
    subGroup: "Sub Group",
    aRaipur: "A RAIPUR",
    bRaigarh: "B RAIGARH",
    cAmbikapur: "C AMBIKAPUR",
    dSatna: "D SATNA",
    lastPurchaseDate: "Last Purchase Date",
    applicableDate: "Applicable Date",
    standardRate: "Standard Rate",
    locationRaipur: "Location A RAIPUR",
    locationRaigarh: "Location B RAIGARH",
    locationAmbikapur: "Location C AMBIKAPUR",
    locationSatna: "Location D SATNA",
    raipurStockValue: "Raipur Stock Value",
    raigarhStockValue: "Raigarh Stock Value",
    ambikapurStockValue: "Ambikapur Stock Value",
    satnaStockValue: "Satna Stock Value",
    stockStatus: "Stock Status",
    lowStock: "Low Stock",
    outOfStock: "Out of Stock",
    inStock: "In Stock",
    minimumQty: "Minimum Qty",
    pendingOrderInHO: "Pending Order In HO",
    needToOrder: "Need to Order",
    status: "Status",
    hsnCode: "HSN Code",
    totalQty: "Total Qty",
    totalPrice: "Total Price",
  };

  for (const [field, header] of Object.entries(fieldMap)) {
    const idx = headers[header];
    if (idx !== undefined) {
      const val = data[field];
      if (val !== undefined && val !== null && val !== "") {
        row[idx] = val;
      }
    }
  }

  return row;
}

export async function createPart(data) {
  await ensurePartsLoaded();
  const row = partToRowArray(data, partsHeaders);
  await appendSheetRows(PARTS_SHEET_TAB, [row]);

  const entry = {
    _id: `row-${partsCache.length}`,
    partNo: data.partNo || "",
    description: data.description || "",
    group: data.group || "",
    subGroup: data.subGroup || "",
    aRaipur: data.aRaipur || 0,
    bRaigarh: data.bRaigarh || 0,
    cAmbikapur: data.cAmbikapur || 0,
    dSatna: data.dSatna || 0,
    lastPurchaseDate: data.lastPurchaseDate || "",
    applicableDate: data.applicableDate || "",
    standardRate: data.standardRate || 0,
    locationRaipur: data.locationRaipur || "",
    locationRaigarh: data.locationRaigarh || "",
    locationAmbikapur: data.locationAmbikapur || "",
    locationSatna: data.locationSatna || "",
    raipurStockValue: data.raipurStockValue || 0,
    raigarhStockValue: data.raigarhStockValue || 0,
    ambikapurStockValue: data.ambikapurStockValue || 0,
    satnaStockValue: data.satnaStockValue || 0,
    stockStatus: data.stockStatus || "",
    lowStock: data.lowStock || 0,
    outOfStock: data.outOfStock || 0,
    inStock: data.inStock || 0,
    minimumQty: data.minimumQty || 0,
    pendingOrderInHO: data.pendingOrderInHO || 0,
    needToOrder: data.needToOrder || 0,
    status: data.status || "",
    hsnCode: data.hsnCode || "",
    totalQty: data.totalQty || 0,
    totalPrice: data.totalPrice || 0,
  };
  partsCache.push(entry);
  storeGlobalCache();

  return entry;
}

export async function updatePartByRowIndex(index, data) {
  await ensurePartsLoaded();
  const existing = partsCache[index];
  if (!existing) return null;

  const updated = { ...existing, ...data };
  const row = partToRowArray(updated, partsHeaders);
  const numCols = Object.keys(partsHeaders).length;
  const lastCol = getColumnLetter(numCols - 1);
  const sheetRow = index + 2;

  await updateSheetRow(PARTS_SHEET_TAB, `A${sheetRow}:${lastCol}${sheetRow}`, [row]);

  partsCache[index] = updated;
  storeGlobalCache();

  return updated;
}

export async function deletePartByRowIndex(index) {
  await ensurePartsLoaded();
  const existing = partsCache[index];
  if (!existing) return false;

  const numCols = Object.keys(partsHeaders).length;
  const lastCol = getColumnLetter(numCols - 1);
  const sheetRow = index + 2;

  await clearSheetRange(PARTS_SHEET_TAB, `A${sheetRow}:${lastCol}${sheetRow}`);

  partsCache[index] = {
    _id: `row-${index}`,
    partNo: "",
    description: "",
    group: "",
    subGroup: "",
    aRaipur: 0,
    bRaigarh: 0,
    cAmbikapur: 0,
    dSatna: 0,
    lastPurchaseDate: "",
    applicableDate: "",
    standardRate: 0,
    locationRaipur: "",
    locationRaigarh: "",
    locationAmbikapur: "",
    locationSatna: "",
    raipurStockValue: 0,
    raigarhStockValue: 0,
    ambikapurStockValue: 0,
    satnaStockValue: 0,
    stockStatus: "",
    lowStock: 0,
    outOfStock: 0,
    inStock: 0,
    minimumQty: 0,
    pendingOrderInHO: 0,
    needToOrder: 0,
    status: "",
    hsnCode: "",
    totalQty: 0,
    totalPrice: 0,
  };
  storeGlobalCache();
  return true;
}

// ─── QUOTATION ─────────────────────────────────────────────────────────────────

// ─── QUOTATION (DATA SHEET) ───────────────────────────────────────────────────
// These header names are the SINGLE SOURCE OF TRUTH for the new "Data" sheet.
// Fields are identified by header name only — never by fixed column position —
// so columns can be added/reordered in the sheet without breaking the app.
// Section banner headers (CUSTOMER DETAILS, QUOTATION DETAILS, etc.) are listed
// for completeness but are never read or written as business fields.
// The two identical "Quotation Reminder Status Reminder Status" headers are
// intentionally kept; buildHeaderMap exposes the 2nd occurrence as
// "Quotation Reminder Status Reminder Status #2".
const DATA_SHEET_HEADERS = [
  "Record #",
  "Timestamp",
  "CUSTOMER DETAILS",
  "Customer Name",
  "Full Address with GST",
  "Full Address",
  "GST NO.#",
  "State Name",
  "State Code",
  "Contact Person",
  "Contact Number",
  "Designation",
  "Email Id To",
  "Email CC",
  "Location",
  "User ID",
  "Engineer Remark",
  "Division",
  "Source Of Enquiry",
  "Enquiry Generated by",
  "His Number",
  "His Email Id",
  "Quotation No",
  "Validity",
  "Quotation Date",
  "Partyref No.",
  "Partyref Dt.",
  "Payment Terms",
  "Quotation Validity",
  "Terms Of Delivery",
  "Quotation Followup by",
  "Revise No.",
  "Branch",
  "Part Number",
  "Part Descriptions",
  "HSN Code",
  "UOM",
  "GST Rate",
  "Quantity",
  "Unit Price",
  "Other Rate",
  "Disc.",
  "Sub Amount",
  "Total Amount",
  "Basic Total Amount",
  "Availability",
  "Price (w.e.f)",
  "Live Stock",
  "GST Amount",
  "Attach Quotation File",
  "Status",
  "Revised Status",
  "Revised Quotation Form",
  "Quotation Revised Bottom",
  "QUOTATION DETAILS",
  "Planned Quotation Status",
  "Quotation Status",
  "Preview Link",
  "Required Feedback Before sent Quotation",
  "Revised Status1",
  "Revised Status2",
  "Revised Status3",
  "Week No",
  "HTML Email",
  "Revised HTML Email",
  "Actual Quotation Status",
  "QUOTATION FOLLOWUP DETAILS",
  "Planned Order Follow-up",
  "Number of Followup",
  "Order Follow-up Summary",
  "Next Followup date",
  "Next followup Status",
  "Week Wise Status",
  "Order Status",
  "Order received Date",
  "Order PDF File",
  "Remark for Order Received",
  "Send trigger for Order verification",
  "Quotation Followup Link",
  "HTML for Next followup",
  "Actual Followup order",
  "CUSTOMER ORDER DETAILS",
  "Planned Order Verification Status",
  "Order Number",
  "Order Date",
  "Order Verification Status",
  "Attached Payment Receipt",
  "Post Column Status",
  "Actual Order Verification Status",
  "Invoice details Against Order",
  "Planned Invoice Details Against Order",
  "Invoice No.",
  "Invoice date",
  "Invoice PDF File",
  "Invoice Status",
  "Actual Invoice Details Against Order",
  "Step 1 Completion Reminder",
  "Step 2 Completion Reminder",
  "Step 3 Completion Reminder",
  "Step 4 Completion Reminder",
  "Step 5 Completion Reminder",
  "Step 6 Completion Reminder",
  "Submission ID",
  "FormEditUrl",
  "Quotation Reminder Status Reminder Status",
  "Quotation Reminder Status Reminder Status",
  "Revised Template 1 Reminder Status",
  "Revised Template 2 Reminder Status",
  "Revised Template 3 Reminder Status",
  "Next Followup Reminder Status",
  "Client revised mail sent-1 Reminder Status",
  "Client revised mail sent-2 Reminder Status",
  "Client revised mail sent-3 Reminder Status",
  "Service Engineer Reminder Status",
  "Quotation Reminder Status",
];

async function ensureDataHeadersLoaded() {
  if (dataHeadersCache) return;

  if (restoreGlobalCache() && dataHeadersCache) return;

  const globalLoading = getGlobalLoading("dataHeaders");
  if (globalLoading) {
    await globalLoading;
    restoreGlobalCache();
    return;
  }

  if (dataHeadersLoadPromise) return dataHeadersLoadPromise;

  dataHeadersLoadPromise = (async () => {
    console.time("sheets-load-data-headers");
    // Read the full used range of the Data sheet. The header map is built from
    // the LIVE header row (row 0) so column positions are always derived from
    // the actual sheet — never from a hardcoded range or index. This keeps the
    // app correct even if columns are added or reordered later.
    const rows = await readSheetRange(DATA_SHEET_TAB, null);
    console.timeEnd("sheets-load-data-headers");

    if (rows && rows.length > 0) {
      dataHeadersCache = buildHeaderMap(rows[0]);
    } else {
      dataHeadersCache = buildHeaderMap(DATA_SHEET_HEADERS);
    }

    storeGlobalCache();
  })();

  setGlobalLoading("dataHeaders", dataHeadersLoadPromise);

  try {
    await dataHeadersLoadPromise;
  } finally {
    dataHeadersLoadPromise = null;
    setGlobalLoading("dataHeaders", null);
  }
}

function invalidateDataHeadersCache() {
  dataHeadersCache = null;
  if (typeof globalThis !== "undefined" && globalThis.__sheetsCache) {
    globalThis.__sheetsCache.dataHeaders = undefined;
  }
}

// The set of quotation columns the app actually owns. Writes are bounded to the
// widest of these headers so "Record #", section banners, Status and the
// follow-up / order / invoice / reminder columns are NEVER overwritten by the
// app — only Data rows already owned by the app are rewritten on edit.
const QUOTATION_WRITE_HEADERS = [
  "Timestamp",
  "Customer Name",
  "Full Address with GST",
  "Full Address",
  "GST NO.#",
  "State Name",
  "State Code",
  "Contact Person",
  "Contact Number",
  "Designation",
  "Email Id To",
  "Email CC",
  "Location",
  "User ID",
  "Engineer Remark",
  "Division",
  "Source Of Enquiry",
  "Enquiry Generated by",
  "His Number",
  "His Email Id",
  "Quotation No",
  "Validity",
  "Quotation Date",
  "Partyref No.",
  "Partyref Dt.",
  "Payment Terms",
  "Quotation Validity",
  "Terms Of Delivery",
  "Quotation Followup by",
  "Revise No.",
  "Branch",
  "Part Number",
  "Part Descriptions",
  "HSN Code",
  "UOM",
  "GST Rate",
  "Quantity",
  "Unit Price",
  "Other Rate",
  "Disc.",
  "Sub Amount",
  "Total Amount",
  "Basic Total Amount",
  "Availability",
  "Price (w.e.f)",
  "Live Stock",
  "GST Amount",
];

function quotationRowWidth(headers) {
  let lastIndex = 0;
  for (const header of QUOTATION_WRITE_HEADERS) {
    const idx = headers[header];
    if (idx !== undefined && idx + 1 > lastIndex) {
      lastIndex = idx + 1;
    }
  }
  return lastIndex;
}

export async function buildQuotationRows(quotation, { quotationId, createdAt }) {
  const { customer, quotation: info, items } = quotation;
  await ensureDataHeadersLoaded();

  const headers = dataHeadersCache || buildHeaderMap(DATA_SHEET_HEADERS);
  const numCols = quotationRowWidth(headers);

  function calcSubAmount(item) {
    return toNumber(item.quantity) * toNumber(item.unitPrice);
  }

  function calcBasicTotal(item) {
    return toNumber(item.quantity) * (toNumber(item.unitPrice) + toNumber(item.otherRate));
  }

  return items.map((item) => {
    const row = new Array(numCols).fill("");
    const fieldMap = {
      Timestamp: toSheetTimestamp(createdAt),
      "Customer Name": customer.customerName,
      "Full Address with GST": customer.fullAddressGst,
      "Full Address": customer.fullAddress || "",
      "GST NO.#": customer.gstNo || "",
      "State Name": customer.stateName || "",
      "State Code": customer.stateCode || "",
      "Contact Person": customer.contactPerson,
      "Contact Number": customer.contactNumber,
      Designation: customer.designation,
      "Email Id To": customer.emailTo,
      "Email CC": customer.emailCc,
      Location: customer.location,
      "User ID": customer.userId,
      "Engineer Remark": customer.engineerRemark,
      Division: info.division,
      "Source Of Enquiry": info.sourceOfEnquiry,
      "Enquiry Generated by": info.enquiryGeneratedBy,
      "His Number": "",
      "His Email Id": "",
      "Quotation No": quotationId,
      Validity: info.quotationValidity,
      "Quotation Date": toSheetDate(info.quotationDate),
      "Partyref No.": info.partyReferenceNumber,
      "Partyref Dt.": toSheetDate(info.partyReferenceDate),
      "Payment Terms": info.paymentTerms,
      "Quotation Validity": info.quotationValidity,
      "Terms Of Delivery": info.termsOfDelivery,
      "Quotation Followup by": info.quotationFollowUpBy,
      "Revise No.": info.reviseNumber,
      Branch: "",
      "Part Number": item.partNumber,
      "Part Descriptions": item.partDescription,
      "HSN Code": item.hsnCode || "",
      // Business rule: UOM is always "Nos" and GST Rate is always 18%.
      // These are forced constants (never taken from the parts master or
      // user input) so every saved quotation row carries the same values.
      UOM: DEFAULT_UOM,
      "GST Rate": String(DEFAULT_GST_RATE),
      Quantity: item.quantity,
      "Unit Price": item.unitPrice,
      "Other Rate": item.otherRate,
      "Disc.": item.discount,
      "Sub Amount": calcSubAmount(item),
      "Total Amount": computeLineTotal(item),
      "Basic Total Amount": calcBasicTotal(item),
      Availability: item.availability,
      "Price (w.e.f)": toSheetDate(item.priceWef),
      "Live Stock": item.liveStock,
      "GST Amount": computeGstAmount(item, DEFAULT_GST_RATE),
    };
    for (const [header, value] of Object.entries(fieldMap)) {
      const idx = headers[header];
      // Allow empty strings to be written so users can clear fields
      // Only skip if the value is undefined or null (never set)
      if (idx !== undefined && idx < numCols && value !== undefined && value !== null) {
        row[idx] = String(value);
      }
    }
    return row;
  });
}

export async function appendQuotation(quotation, meta) {
  const rows = await buildQuotationRows(quotation, meta);

  console.time("sheets-append-quotation");
  await appendSheetRows(DATA_SHEET_TAB, rows);
  console.timeEnd("sheets-append-quotation");

  return { rowsWritten: rows.length };
}

// ─── QUOTATION UPDATE (EDIT) ─────────────────────────────────────────────────────
// Updates the existing DATA-sheet rows that belong to the given quotation number.
// The quotation number is treated as the unique identifier and is NEVER changed.
//
// Strategy (kept safe for the shared DATA sheet):
// - Load the live sheet rows once, find every row whose "Quotation No" equals the
//   target, and remember their sheet row numbers.
// - Rewrite the first N new items over the first N existing rows of that quotation.
// - If there are more new items than old rows, append the surplus rows at the end
//   (grouping by quotation number is preserved on read, so this stays consistent).
// - If there are fewer new items than old rows, clear the leftover rows so no stale
//   item rows remain for the quotation.
// Unrelated rows are never touched, and no new quotation number is generated.
export async function updateQuotationByNo(quotationNo, quotation) {
  const rows = await readSheetRange(DATA_SHEET_TAB, null);

  if (!rows || rows.length < 2) return { success: false, reason: "empty" };

  const headers = buildHeaderMap(rows[0]);

  const targetRowIndices = [];
  for (let i = 1; i < rows.length; i++) {
    if (getCellValue(rows[i], headers, "Quotation No") === quotationNo) {
      targetRowIndices.push(i);
    }
  }

  if (targetRowIndices.length === 0) {
    return { success: false, reason: "not-found" };
  }

  const createdAt = getCellValue(rows[targetRowIndices[0]], headers, "Timestamp");
  const newRows = await buildQuotationRows(quotation, { quotationId: quotationNo, createdAt });
  const writeCols = newRows.length > 0 ? newRows[0].length : quotationRowWidth(headers);
  const writeCol = getColumnLetter(writeCols - 1);

  const sheetRows = targetRowIndices.map((i) => i + 1);
  let rowsWritten = 0;
  let rowsAppended = 0;
  let rowsCleared = 0;

  for (let k = 0; k < Math.min(newRows.length, sheetRows.length); k++) {
    // Preserve every existing cell we do not own (e.g. "Record #" at index 0,
    // section-banner columns, Status, follow-up/order/invoice data) before
    // overlaying the app-owned quotation fields on top.
    const existing = rows[targetRowIndices[k]] || [];
    const merged = existing.slice(0, writeCols);
    for (let c = 0; c < writeCols; c++) {
      if (merged[c] === undefined || merged[c] === null) merged[c] = "";
    }
    // Overlay new quotation data. Empty strings from buildQuotationRows
    // intentionally clear fields, so we allow them to overwrite existing values.
    // This fixes the bug where users couldn't clear editable fields.
    for (let c = 0; c < newRows[k].length; c++) {
      merged[c] = newRows[k][c];
    }
    
    const range = `A${sheetRows[k]}:${writeCol}${sheetRows[k]}`;
    await updateSheetRow(DATA_SHEET_TAB, range, [merged]);
    rowsWritten += 1;
  }

  if (newRows.length > sheetRows.length) {
    const extra = newRows.slice(sheetRows.length);
    await appendSheetRows(DATA_SHEET_TAB, extra);
    rowsAppended = extra.length;
  } else if (newRows.length < sheetRows.length) {
    const fullCol = getColumnLetter(rows[0].length - 1);
    const rowsToClear = [];
    for (let k = newRows.length; k < sheetRows.length; k++) {
      const range = `A${sheetRows[k]}:${fullCol}${sheetRows[k]}`;
      rowsToClear.push(range);
      await clearSheetRange(DATA_SHEET_TAB, range);
      rowsCleared += 1;
    }
  }

  return { success: true, quotationNo, rowsWritten, rowsAppended, rowsCleared };
}

// ─── QUOTATION LIST ─────────────────────────────────────────────────────────────
// The quotation list is treated as a live view of the DATA sheet. We deliberately
// do NOT keep a persistent in-memory snapshot of quotations.
//
// WHY: On Vercel each route handler runs as its own serverless instance and the
// runtime keeps MULTIPLE warm instances alive at once. In-memory module variables
// and even `globalThis` are per-process and are NOT shared between instances.
// Therefore invalidating an in-memory cache after a POST only clears the cache on
// the instance that handled the POST; any other warm GET instance keeps serving
// its own stale snapshot. That is exactly the consistency bug the previous
// cache-invalidation approach (commit d6579af) could not fix.
//
// FIX: Read quotations fresh from Google Sheets on every read and never serve a
// snapshot. A GET on ANY instance therefore returns whatever is currently in the
// sheet. TTL = 0; the only possible staleness is the (near-instant) propagation of
// the sheet write itself. Cost is one full range read per call — acceptable for
// a small quotation sheet and required for correctness.
//
// Exported (additive, read-only) so the dashboard aggregation route can read the
// same single source of truth plus the detail map (for Source Of Enquiry) without
// performing a second Google Sheets read.
export async function loadQuotations() {
  const rows = await readSheetRange(DATA_SHEET_TAB, null);

  if (!rows || rows.length < 2) {
    return { quotations: [], detailMap: new Map() };
  }

  const headers = buildHeaderMap(rows[0]);
  const dataRows = rows.slice(1);
  const groups = new Map();
  const detailMap = new Map();

  for (const row of dataRows) {
    const quotationNo = getCellValue(row, headers, "Quotation No");
    if (!quotationNo) continue;

    if (!groups.has(quotationNo)) {
      groups.set(quotationNo, {
        quotationNo,
        customerName: getCellValue(row, headers, "Customer Name"),
        contactNumber: getCellValue(row, headers, "Contact Number"),
        quotationDate: getCellValue(row, headers, "Quotation Date"),
        division: getCellValue(row, headers, "Division"),
        engineer: getCellValue(row, headers, "Enquiry Generated by"),
        status: getCellValue(row, headers, "Status"),
        numberOfFollowup: getCellValue(row, headers, "Number of Followup"),
        orderStatus: getCellValue(row, headers, "Order Status"),
        itemCount: 0,
        totalAmount: 0,
      });
      detailMap.set(quotationNo, []);
    }

    const group = groups.get(quotationNo);
    group.itemCount += 1;
    group.totalAmount += getCellNum(row, headers, "Total Amount");

    detailMap.get(quotationNo).push({
      partNumber: getCellValue(row, headers, "Part Number"),
      description: getCellValue(row, headers, "Part Descriptions"),
      hsnCode: getCellValue(row, headers, "HSN Code"),
      uom: getCellValue(row, headers, "UOM") || DEFAULT_UOM,
      gstRate: getCellValue(row, headers, "GST Rate") || String(DEFAULT_GST_RATE),
      quantity: getCellNum(row, headers, "Quantity"),
      unitPrice: getCellNum(row, headers, "Unit Price"),
      otherRate: getCellNum(row, headers, "Other Rate"),
      discount: getCellNum(row, headers, "Disc."),
      availability: getCellValue(row, headers, "Availability"),
      liveStock: getCellValue(row, headers, "Live Stock"),
      priceWef: getCellValue(row, headers, "Price (w.e.f)"),
      total: getCellNum(row, headers, "Total Amount"),
    });

    // Store customer + quotation info from first row of each group
    if (detailMap.get(quotationNo).length === 1) {
      const firstRow = detailMap.get(quotationNo)[0];
      firstRow._customer = {
        customerName: getCellValue(row, headers, "Customer Name"),
        fullAddressGst: getCellValue(row, headers, "Full Address with GST"),
        fullAddress: getCellValue(row, headers, "Full Address"),
        gstNo: getCellValue(row, headers, "GST NO.#"),
        stateName: getCellValue(row, headers, "State Name"),
        stateCode: getCellValue(row, headers, "State Code"),
        contactPerson: getCellValue(row, headers, "Contact Person"),
        contactNumber: getCellValue(row, headers, "Contact Number"),
        designation: getCellValue(row, headers, "Designation"),
        emailTo: getCellValue(row, headers, "Email Id To"),
        emailCc: getCellValue(row, headers, "Email CC"),
        location: getCellValue(row, headers, "Location"),
        userId: getCellValue(row, headers, "User ID"),
        engineerRemark: getCellValue(row, headers, "Engineer Remark"),
      };
      firstRow._quotation = {
        quotationDate: getCellValue(row, headers, "Quotation Date"),
        division: getCellValue(row, headers, "Division"),
        sourceOfEnquiry: getCellValue(row, headers, "Source Of Enquiry"),
        enquiryGeneratedBy: getCellValue(row, headers, "Enquiry Generated by"),
        paymentTerms: getCellValue(row, headers, "Payment Terms"),
        quotationValidity: getCellValue(row, headers, "Quotation Validity"),
        termsOfDelivery: getCellValue(row, headers, "Terms Of Delivery"),
        partyReferenceNumber: getCellValue(row, headers, "Partyref No."),
        partyReferenceDate: getCellValue(row, headers, "Partyref Dt."),
        quotationFollowUpBy: getCellValue(row, headers, "Quotation Followup by"),
        status: getCellValue(row, headers, "Status"),
      };
      firstRow._followup = {
        plannedOrderFollowUp: getCellValue(row, headers, "Planned Order Follow-up"),
        numberOfFollowup: getCellValue(row, headers, "Number of Followup"),
        orderFollowUpSummary: getCellValue(row, headers, "Order Follow-up Summary"),
        nextFollowupDate: getCellValue(row, headers, "Next Followup date"),
        nextFollowupStatus: getCellValue(row, headers, "Next followup Status"),
        weekWiseStatus: getCellValue(row, headers, "Week Wise Status"),
        orderStatus: getCellValue(row, headers, "Order Status"),
        orderReceivedDate: getCellValue(row, headers, "Order received Date"),
        orderPDFFile: getCellValue(row, headers, "Order PDF File"),
        remarkForOrderReceived: getCellValue(row, headers, "Remark for Order Received"),
        sendTriggerForOrderVerification: getCellValue(row, headers, "Send trigger for Order verification"),
        quotationFollowupLink: getCellValue(row, headers, "Quotation Followup Link"),
        htmlForNextFollowup: getCellValue(row, headers, "HTML for Next followup"),
        actualFollowupOrder: getCellValue(row, headers, "Actual Followup order"),
        orderNumber: getCellValue(row, headers, "Order Number"),
        orderDate: getCellValue(row, headers, "Order Date"),
        orderVerificationStatus: getCellValue(row, headers, "Order Verification Status"),
        attachedPaymentReceipt: getCellValue(row, headers, "Attached Payment Receipt"),
      };
    }
  }

  const quotations = Array.from(groups.values());
  quotations.sort((a, b) => b.quotationNo.localeCompare(a.quotationNo));

  return { quotations, detailMap };
}

export async function getQuotations() {
  const { quotations } = await loadQuotations();
  return quotations;
}

// Generate sequential quotation number in format: DEEP/M-SPR/25-26/Q000001
export async function generateNextQuotationNumber() {
  const { quotations } = await loadQuotations();

  // Get current financial year (April to March)
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  
  let financialYear;
  if (month >= 4) {
    // April onwards: current year - next year
    financialYear = `${String(year).slice(-2)}-${String(year + 1).slice(-2)}`;
  } else {
    // Jan-March: previous year - current year
    financialYear = `${String(year - 1).slice(-2)}-${String(year).slice(-2)}`;
  }
  
  // Find highest quotation number for current financial year
  let maxNumber = 0;
  const prefix = `DEEP/M-SPR/${financialYear}/Q`;
  
  for (const quotation of quotations) {
    const quotationNo = quotation.quotationNo;
    if (quotationNo && quotationNo.startsWith(prefix)) {
      const numberPart = quotationNo.replace(prefix, "");
      const number = parseInt(numberPart, 10);
      if (!isNaN(number) && number > maxNumber) {
        maxNumber = number;
      }
    }
  }
  
  // Generate next number with 6 digits
  const nextNumber = maxNumber + 1;
  const paddedNumber = String(nextNumber).padStart(6, '0');
  
  return `${prefix}${paddedNumber}`;
}

export async function getQuotationByNo(quotationNo) {
  const { detailMap } = await loadQuotations();

  // The dynamic route may deliver the quotation number percent-encoded (e.g.
  // "DEEP%2FM-SPR%2F26-27%2FQ000001" on Vercel) while detailMap is keyed by the
  // decoded sheet value. Decode defensively before lookup; if it is already
  // decoded or malformed, fall back to the original value.
  let normalizedQuotationNo = quotationNo;
  try {
    normalizedQuotationNo = decodeURIComponent(quotationNo);
  } catch {
    normalizedQuotationNo = quotationNo;
  }

  // Trim to match the detailMap key construction (getCellValue trims sheet values)
  normalizedQuotationNo = normalizedQuotationNo.trim();

  const items = detailMap ? detailMap.get(normalizedQuotationNo) : null;
  if (!items || items.length === 0) return null;

  const { _customer, _quotation, _followup } = items[0];
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const grandTotal = items.reduce((sum, item) => sum + item.total, 0);

  return {
    quotationNo: normalizedQuotationNo,
    customer: _customer || {},
    quotation: _quotation || {},
    followup: _followup || {},
    items: items.map(({ _customer, _quotation, _followup, ...rest }) => rest),
    totals: {
      itemCount: items.length,
      subtotal,
      grandTotal,
    },
  };
}

// ─── QUOTATION FOLLOW-UP HISTORY (Followup Form for Quotation) ─────────────────
// This sheet is a pure HISTORY/LOG. Every follow-up or order-status submission
// appends ONE new row below the previous ones. Old rows are NEVER rewritten,
// cleared, or deleted. None of the shared three working sheets are touched.
//
// Column positions come from the LIVE header row, so future column additions or
// reorders never shift the values the app writes. The app only writes the
// columns it owns; blank fields stay blank and any separately maintained column
// is left completely alone.

const FOLLOWUP_FORM_HEADERS = [
  "Timestamp",
  "Quotation No",
  "Submission Type",
  "Next Followup Date",
  "Followup Status",
  "Followup Remark",
  "Order Status",
  "Attach Order PDF",
  "Order Received date",
  "Remark for Order",
  "Order Number",
  "Order Date",
  "Order Verification Status",
  "Attached Payment Receipt",
  "Due Days",
  "Prefilled Form",
  "Prefilled Form URL",
];

// The columns the app itself may write. Kept separate so future additions to
// FOLLOWUP_FORM_HEADERS (used purely as a read fallback) never widen writes.
const FOLLOWUP_FORM_WRITE_HEADERS = FOLLOWUP_FORM_HEADERS.slice();

async function readFollowupFormHeaders() {
  // Read only the live header row ("A1:1" = every column of row 1). The map is
  // built from the ACTUAL sheet, never a hardcoded column count or such "A:Q".
  const rows = await readSheetRange(FOLLOWUP_FORM_SHEET_TAB, "A1:1");
  if (rows && rows.length > 0 && rows[0] && rows[0].some((v) => v !== undefined && v !== null && v !== "")) {
    return buildHeaderMap(rows[0]);
  }
  return buildHeaderMap(FOLLOWUP_FORM_HEADERS);
}

function followupRowWidth(headers) {
  let lastIndex = 0;
  for (const header of FOLLOWUP_FORM_WRITE_HEADERS) {
    const idx = headers[header];
    if (idx !== undefined && idx + 1 > lastIndex) {
      lastIndex = idx + 1;
    }
  }
  return lastIndex;
}

/**
 * Builds a single history row (values placed by header name) for the follow-up
 * log sheet. Fields not provided (or not owned by the app) remain blank.
 */
export async function buildFollowupFormRow(data) {
  let headers;
  try {
    headers = await readFollowupFormHeaders();
  } catch {
    headers = buildHeaderMap(FOLLOWUP_FORM_HEADERS);
  }
  const width = followupRowWidth(headers);
  const row = new Array(width).fill("");

  const fieldMap = {
    Timestamp: toSheetTimestamp(data.timestamp),
    "Quotation No": data.quotationNo,
    "Submission Type": data.submissionType,
    "Next Followup Date": toSheetDate(data.nextFollowupDate),
    "Followup Status": data.followupStatus,
    "Followup Remark": data.followupRemark,
    "Order Status": data.orderStatus,
    "Attach Order PDF": data.attachOrderPDF,
    "Order Received date": toSheetDate(data.orderReceivedDate),
    "Remark for Order": data.remarkForOrder,
    "Order Number": data.orderNumber,
    "Order Date": toSheetDate(data.orderDate),
    "Order Verification Status": data.orderVerificationStatus,
    "Attached Payment Receipt": data.attachedPaymentReceipt,
    "Due Days": data.dueDays,
    "Prefilled Form": data.prefilledForm,
    "Prefilled Form URL": data.prefilledFormUrl,
  };

  for (const [header, value] of Object.entries(fieldMap)) {
    const idx = headers[header];
    if (
      idx !== undefined &&
      idx < width &&
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      row[idx] = String(value);
    }
  }

  return row;
}

/**
 * Appends ONE new history row to "Followup Form for Quotation".
 *
 * - Timestamp defaults to now (ISO) unless the caller supplies one.
 * - The row is written by header name and only into columns the app owns.
 * - Existing history rows are never touched, cleared or overwritten.
 *
 * Returns `{ rowsWritten, quotationNo, submissionType }`.
 */
export async function appendQuotationFollowupRecord(data) {
  const timestamp = data.timestamp || new Date().toISOString();
  const row = await buildFollowupFormRow({ ...data, timestamp });

  await appendSheetRows(FOLLOWUP_FORM_SHEET_TAB, [row]);

  return {
    rowsWritten: 1,
    quotationNo: data.quotationNo || "",
    submissionType: data.submissionType || "",
  };
}

function followupTimestampValue(value) {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;
  const date = parseTimestampInput(value);
  return date ? date.getTime() : 0;
}

function followupTimestampKey(record) {
  const timestamp = record.Timestamp || record.timestamp || "";
  return timestamp ? followupTimestampValue(timestamp) : 0;
}

/**
 * Shared reader for "Followup Form for Quotation".
 *
 * - Reads the live used range (never hardcodes columns or "A:Q"), then maps
 *   every header by name from the ACTUAL sheet so new columns are picked up
 *   automatically and unknown additions remain available on each record.
 * - Completely empty data rows are skipped.
 * - Records are sorted newest-first (by Timestamp; sheet row order is the
 *   tiebreaker for equal/unparseable timestamps).
 * - READ-ONLY: never updates, clears, or appends anything.
 *
 * Returns `[{ Timestamp, "Quotation No", "Submission Type", ...all columns }]`.
 */
export async function readFollowupFormRecords() {
  const rows = await readSheetRange(FOLLOWUP_FORM_SHEET_TAB, null);

  if (!rows || rows.length < 2) return [];

  const headers = buildHeaderMap(rows[0]);
  const headerNames = Object.keys(headers);
  const records = [];

  for (let i = 1; i < rows.length; i++) {
    const record = {};
    let hasAnyValue = false;
    for (const name of headerNames) {
      const value = getCellValue(rows[i], headers, name);
      record[name] = value;
      if (value !== "") hasAnyValue = true;
    }
    if (!hasAnyValue) continue;
    record.__sheetRow = i + 1;
    records.push(record);
  }

  records.sort((a, b) => {
    const ta = followupTimestampKey(a);
    const tb = followupTimestampKey(b);
    if (ta !== tb) return ta > tb ? -1 : 1;
    return (a.__sheetRow || 0) - (b.__sheetRow || 0);
  });

  return records;
}

/**
 * Returns the COMPLETE follow-up / order-status history for one quotation from
 * "Followup Form for Quotation". Newest first.
 */
export async function getQuotationFollowupHistory(quotationNo) {
  const records = await readFollowupFormRecords();
  return records.filter((record) => record["Quotation No"] === quotationNo);
}

function followupDateValue(value) {
  const parsed = parseSheetDateInput(value);
  return parsed ? parsed.getTime() : 0;
}

/**
 * Returns the single current PENDING follow-up record per quotation — the newest
 * "Next Follow-up" history row whose Followup Status is explicitly "Pending".
 * Order Status rows are NEVER considered follow-up records. Quotations with no
 * Pending Next Follow-up row are omitted, so at most one current Pending exists
 * per quotation and a past-dated Pending record stays Pending (a past date never
 * auto-completes it).
 *
 * This backs the "Pending Follow-ups" dashboard card/detail view. Completed
 * records never appear here — they are read from the full history separately,
 * so all historical Completed rows are preserved.
 *
 * Records are sorted by "Next Followup Date" ascending.
 */
export async function getCurrentPendingFollowupRecords() {
  const records = await readFollowupFormRecords();

  const currentByQuotation = new Map();
  for (const record of records) {
    const quotationNo = (record["Quotation No"] || "").trim();
    if (!quotationNo) continue;
    // Follow-up records are identified by Submission Type = "Next Follow-up".
    // Order Status rows must never appear as follow-up records.
    if (String(record["Submission Type"] || "").trim() !== "Next Follow-up") continue;
    if (String(record["Followup Status"] || "").trim() !== "Pending") continue;
    // Records are newest-first; the first Pending Next Follow-up row per
    // quotation is its current Pending follow-up.
    if (!currentByQuotation.has(quotationNo)) {
      currentByQuotation.set(quotationNo, record);
    }
  }

  const current = Array.from(currentByQuotation.values());
  current.sort((a, b) => {
    const ta = followupDateValue(a["Next Followup Date"]);
    const tb = followupDateValue(b["Next Followup Date"]);
    if (ta !== tb) return ta < tb ? -1 : 1;
    return (a.__sheetRow || 0) - (b.__sheetRow || 0);
  });

  return current;
}

/**
 * Returns ALL follow-up / order-status records from "Followup Form for Quotation".
 * Newest first. Used for dashboard today's follow-ups feature.
 */
// Removed duplicate function

// ─── QUOTATION FOLLOW-UP UPDATE (DATA SHEET) ────────────────────────────────────
// Updates ONLY the follow-up fields of an existing DATA-sheet quotation.
//
// Data-preservation rules (critical — the DATA sheet is shared with other
// systems):
// - The live sheet rows are read once and every row whose "Quotation No"
//   matches the target is located by header name.
// - Each existing row is cloned in full (every cell, including "Record #",
//   Status, revised/reminder/invoice/order columns the app does not own).
// - Only the supplied header-based fields are overlaid on the clone.
// - The complete preserved row is written back, so no column is ever cleared,
//   truncated, or replaced by a short generated array.
// Column positions always come from the live header map, so future column
// additions/reorders never break the write.
async function updateQuotationDataFieldsByNo(quotationNo, buildFieldValues) {
  const rows = await readSheetRange(DATA_SHEET_TAB, null);

  if (!rows || rows.length < 2) return { success: false, reason: "empty" };

  const headers = buildHeaderMap(rows[0]);

  const targetRowIndices = [];
  for (let i = 1; i < rows.length; i++) {
    if (getCellValue(rows[i], headers, "Quotation No") === quotationNo) {
      targetRowIndices.push(i);
    }
  }

  if (targetRowIndices.length === 0) {
    return { success: false, reason: "not-found" };
  }

  const fieldValues = buildFieldValues(rows, headers, targetRowIndices);

  // Use the widest row in the range so we never truncate any preserved column.
  const numCols = rows.reduce((max, r) => Math.max(max, r.length), 0);
  const lastCol = getColumnLetter(numCols - 1);

  for (const i of targetRowIndices) {
    const merged = (rows[i] || []).slice(0, numCols);
    for (let c = merged.length; c < numCols; c++) merged.push("");

    for (const [header, value] of Object.entries(fieldValues)) {
      const idx = headers[header];
      if (idx !== undefined && idx < numCols && value !== undefined && value !== null) {
        merged[idx] = String(value);
      }
    }

    await updateSheetRow(DATA_SHEET_TAB, `A${i + 1}:${lastCol}${i + 1}`, [merged]);
  }

  return { success: true, quotationNo, rowsUpdated: targetRowIndices.length };
}

/**
 * Marks the quotation's PENDING follow-up records as "Completed" in the history
 * sheet. Every history row whose Submission Type is "Next Follow-up" AND
 * Followup Status is "Pending" is set to "Completed". This guarantees the
 * quotation has exactly one actionable state going forward: when a new Next
 * Follow-up is created the previous Pending row(s) close, and when a terminal
 * Order Status is submitted the current Pending row(s) close. Already-Completed
 * history is never changed, and Order Status rows (which always keep Followup
 * Status blank) are never treated as follow-up records. When there is no
 * Pending Next Follow-up row nothing is written.
 */
async function completePendingFollowupsForQuotation(quotationNo) {
  const records = await getQuotationFollowupHistory(quotationNo);
  if (records.length === 0) return;

  const headers = await readFollowupFormHeaders();
  const statusIdx = headers["Followup Status"];
  if (statusIdx === undefined) return;

  const colLetter = getColumnLetter(statusIdx);

  const pendingRows = records
    .filter((record) => {
      if (String(record["Submission Type"] || "").trim() !== "Next Follow-up") return false;
      return String(record["Followup Status"] || "").trim() === "Pending";
    })
    .filter((record) => record.__sheetRow)
    .map((record) => record.__sheetRow);

  for (const sheetRow of pendingRows) {
    const range = `${colLetter}${sheetRow}:${colLetter}${sheetRow}`;
    await updateSheetRow(FOLLOWUP_FORM_SHEET_TAB, range, [["Completed"]]);
  }
}

/**
 * Records a "Next Follow-up" submission.
 *
 * 1. Updates the Data-sheet quotation (by "Quotation No"):
 *    - "Next Followup date"  <- submitted date
 *    - "Order Follow-up Summary" <- submitted remark
 *    - "Next followup Status" <- "Pending"
 *    - "Number of Followup"  <- previous value + 1 (0 when empty/non-numeric)
 * 2. Closes the quotation's previous current follow-up in the history sheet by
 *    setting its "Followup Status" to "Completed" (the row is kept, never
 *    deleted), so the quotation keeps at most one Pending follow-up.
 * 3. Appends ONE new history row to "Followup Form for Quotation"
 *    (Submission Type = "Next Follow-up", Followup Status = "Pending").
 *
 * Follow-up status is always assigned automatically: the new follow-up becomes
 * "Pending" and the previous current one becomes "Completed".
 *
 * Success is reported only when BOTH writes succeed. If either fails the
 * caller receives success:false and no success message is sent to the user.
 */
export async function updateQuotationNextFollowup(quotationNo, data) {
  const timestamp = new Date().toISOString();

  const dataResult = await updateQuotationDataFieldsByNo(quotationNo, (rows, headers, idxs) => {
    const currentCount = getCellNum(rows[idxs[0]], headers, "Number of Followup");
    return {
      "Next Followup date": toSheetDate(data.nextFollowupDate || ""),
      "Order Follow-up Summary": data.followupRemark || "",
      "Next followup Status": "Pending",
      "Number of Followup": String(currentCount + 1),
    };
  });

  if (!dataResult.success) return dataResult;

  try {
    await completePendingFollowupsForQuotation(quotationNo);

    const history = await appendQuotationFollowupRecord({
      timestamp,
      quotationNo,
      submissionType: "Next Follow-up",
      nextFollowupDate: data.nextFollowupDate || "",
      followupStatus: "Pending",
      followupRemark: data.followupRemark || "",
    });
    return { success: true, data: dataResult, history };
  } catch (error) {
    console.error(
      "[updateQuotationNextFollowup] Data updated but history write failed:",
      error
    );
    return { success: false, reason: "history-failed" };
  }
}

// Order Status values that close the quotation's current Pending Next Follow-up.
const CLOSING_ORDER_STATUSES = new Set(["Won", "Loss", "Dead", "Partial"]);

/**
 * Records an "Order Status" submission.
 *
 * 1. Updates the Data-sheet quotation (by "Quotation No"):
 *    - "Order Status"             <- selected status
 *    - "Order Number"             <- submitted order number
 *    - "Order received Date"      <- submitted order received date
 *    - "Remark for Order Received" <- submitted remark
 * 2. When the submitted Order Status is Won / Loss / Dead / Partial, closes the
 *    quotation's current Pending Next Follow-up in the history sheet by setting
 *    its "Followup Status" to "Completed" (the row is kept, never deleted). If
 *    there is no current Pending follow-up, nothing is changed. Already
 *    Completed history and unrelated records are never touched.
 * 3. Appends ONE history row to "Followup Form for Quotation"
 *    (Submission Type = "Order Status"). The appended row always keeps "Next
 *    Followup Date" and "Followup Status" blank — the Order Status row itself
 *    never becomes a follow-up record.
 *
 * Number of Followup is intentionally NOT changed by this action.
 * Unrelated columns are never touched.
 */
export async function updateQuotationOrderStatus(quotationNo, data) {
  const timestamp = new Date().toISOString();

  const dataResult = await updateQuotationDataFieldsByNo(quotationNo, () => ({
    "Order Status": data.orderStatus || "",
    "Order Number": data.orderNumber || "",
    "Order received Date": toSheetDate(data.orderReceivedDate || ""),
    "Remark for Order Received": data.remarkForOrder || "",
  }));

  if (!dataResult.success) return dataResult;

  try {
    // Close the current Pending Next Follow-up for terminal order statuses.
    if (CLOSING_ORDER_STATUSES.has(String(data.orderStatus || "").trim())) {
      await completePendingFollowupsForQuotation(quotationNo);
    }

    const history = await appendQuotationFollowupRecord({
      timestamp,
      quotationNo,
      submissionType: "Order Status",
      orderStatus: data.orderStatus || "",
      orderNumber: data.orderNumber || "",
      orderReceivedDate: data.orderReceivedDate || "",
      remarkForOrder: data.remarkForOrder || "",
    });
    return { success: true, data: dataResult, history };
  } catch (error) {
    console.error(
      "[updateQuotationOrderStatus] Data updated but history append failed:",
      error
    );
    return { success: false, reason: "history-failed" };
  }
}
