import { readSheetRange, appendSheetRows, updateSheetRow, clearSheetRange, prewarmAuth } from "./googleSheetsClient.js";
import { toNumber, computeLineTotal, computeGstAmount } from "../utils/formatters.js";
import { DEFAULT_UOM, DEFAULT_GST_RATE } from "../constants/quotationOptions.js";

const CUSTOMER_SHEET_TAB = "Quotation";
const PARTS_SHEET_TAB = "Parts Details";
const DATA_SHEET_TAB = "DATA";

// ─── LOW-LEVEL SHEET I/O ───────────────────────────────────────────────────────
// Implemented in googleSheetsClient.js — imported above.

// ─── HEADER MAP HELPERS ────────────────────────────────────────────────────────

function buildHeaderMap(headerRow) {
  const map = {};
  if (headerRow) {
    headerRow.forEach((header, idx) => {
      map[header.trim()] = idx;
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
    const rows = await readSheetRange(CUSTOMER_SHEET_TAB, "A:F");
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

// ─── CUSTOMER HISTORY (DATA-sheet fallback) ──────────────────────────────
// The customer master tab ("Quotation") only holds six columns. Contact and
// extended attributes live in the history tab ("DATA"). To auto-fill a form
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
    const rows = await readSheetRange(DATA_SHEET_TAB, "A:AU");

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
    const rows = await readSheetRange(PARTS_SHEET_TAB, "A:AE");
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
  await ensurePartsLoaded();

  const start = Date.now();
  const cacheSize = partsCache.length;
  const results = [];

  for (const p of partsCache) {
    if (p.partNo && p.partNo.toLowerCase().startsWith(qLower)) {
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

const DATA_SHEET_HEADERS = [
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
  "Status",
  "Revised Quotation Form",
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
    // Only read the first row (headers) to avoid loading thousands of quotation rows.
    const rows = await readSheetRange(DATA_SHEET_TAB, "1:1");
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

export async function buildQuotationRows(quotation, { quotationId, createdAt }) {
  const { customer, quotation: info, items } = quotation;
  await ensureDataHeadersLoaded();

  const headers = dataHeadersCache || buildHeaderMap(DATA_SHEET_HEADERS);
  const numCols = Object.keys(headers).length;

  function calcSubAmount(item) {
    return toNumber(item.quantity) * toNumber(item.unitPrice);
  }

  function calcBasicTotal(item) {
    return toNumber(item.quantity) * (toNumber(item.unitPrice) + toNumber(item.otherRate));
  }

  return items.map((item) => {
    const row = new Array(numCols).fill("");
    const fieldMap = {
      Timestamp: createdAt,
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
      "Quotation Date": info.quotationDate,
      "Partyref No.": info.partyReferenceNumber,
      "Partyref Dt.": info.partyReferenceDate,
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
      "Price (w.e.f)": item.priceWef,
      "Live Stock": item.liveStock,
      "GST Amount": computeGstAmount(item, DEFAULT_GST_RATE),
      Status: "Active",
      "Revised Quotation Form": "No",
    };
    for (const [header, value] of Object.entries(fieldMap)) {
      const idx = headers[header];
      if (idx !== undefined && value !== undefined && value !== null && value !== "") {
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

  // No cache invalidation is needed: the quotation list is never cached in
  // memory (see loadQuotations below), so the next read always reflects the
  // sheet as it exists after this write.

  return { rowsWritten: rows.length };
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
// the sheet write itself. Cost is one range read (A:AU) per call — acceptable for
// a small quotation sheet and required for correctness.
async function loadQuotations() {
  const rows = await readSheetRange(DATA_SHEET_TAB, "A:AU");

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
        quotationDate: getCellValue(row, headers, "Quotation Date"),
        division: getCellValue(row, headers, "Division"),
        engineer: getCellValue(row, headers, "Enquiry Generated by"),
        status: getCellValue(row, headers, "Status"),
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

  const items = detailMap ? detailMap.get(normalizedQuotationNo) : null;
  if (!items || items.length === 0) return null;

  const { _customer, _quotation } = items[0];
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const grandTotal = items.reduce((sum, item) => sum + item.total, 0);

  return {
    quotationNo,
    customer: _customer || {},
    quotation: _quotation || {},
    items: items.map(({ _customer, _quotation, ...rest }) => rest),
    totals: {
      itemCount: items.length,
      subtotal,
      grandTotal,
    },
  };
}
