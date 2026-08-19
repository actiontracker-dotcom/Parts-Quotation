import ExcelJS from "exceljs";
import { formatDate } from "@/lib/utils/formatters";

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const REPORT_HEADERS = [
  "QUOTATION NO",
  "CUSTOMER NAME",
  "CONTACT NUMBER",
  "DIVISION",
  "NOF",
  "ORDER STATUS",
  "QUOTATION DATE",
  "TOTAL AMOUNT",
  "PART NUMBER",
  "DESCRIPTION",
  "QUANTITY",
];

const REPORT_COLUMN_WIDTHS = [32, 32, 15, 11, 6, 14, 15, 16, 15, 42, 10];

// Indian (lakh/crore) currency number format with the rupee symbol.
const INR_AMOUNT_FORMAT =
  '[>=10000000]"₹"##\\,##\\,##\\,##0;[>=100000]"₹"##\\,##\\,##0;"₹"##,##0';

// Soft semantic cells for known order status values. Unknown values fall back
// to a neutral light-blue chip.
const STATUS_STYLES = {
  dead: { fill: "FFFCEBEE", color: "FFB22F47" },
  loss: { fill: "FFFCEBEE", color: "FFB22F47" },
  won: { fill: "FFE9F8F3", color: "FF125F4B" },
  partial: { fill: "FFFCF3E3", color: "FFB87F27" },
  pending: { fill: "FFFCF3E3", color: "FFB87F27" },
  fallback: { fill: "FFEEF1FD", color: "FF2843AD" },
};

const THIN_LIGHT = { style: "thin", color: { argb: "FFDCE3FB" } };
const THIN_GRAY = { style: "thin", color: { argb: "FFE4E6EF" } };

function slugPart(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatShortDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return value || "";
  const [, y, m, d] = match.map(Number);
  return `${String(d).padStart(2, "0")} ${MONTHS_SHORT[m - 1]} ${y}`;
}

function formatReportDate(date) {
  return formatShortDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`);
}

export function buildReportFileName(filters) {
  const parts = [];
  if (filters.orderStatus !== "All") parts.push(slugPart(filters.orderStatus));
  if (filters.division !== "All") parts.push(slugPart(filters.division));
  if (filters.dateWise === "Custom Date Range") {
    parts.push("custom-date");
  } else if (filters.dateWise !== "All") {
    parts.push(slugPart(filters.dateWise));
  }
  const base = parts.length ? parts.join("-") : "all";
  return `quotation-report-${base}.xlsx`;
}

function dateRangeLabel(filters) {
  if (filters.dateWise === "All") return "All";
  if (filters.dateWise === "Custom Date Range") {
    const from = formatShortDate(filters.fromDate);
    const to = formatShortDate(filters.toDate);
    if (from && to) return `${from} - ${to}`;
    if (from) return `From ${from}`;
    if (to) return `Until ${to}`;
    return "Custom Date Range";
  }
  return filters.dateWise;
}

function applyRange(ws, r1, c1, r2, c2, fn) {
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      fn(ws.getCell(r, c));
    }
  }
}

function borderBox(ws, r1, c1, r2, c2, style) {
  applyRange(ws, r1, c1, r2, c2, (cell) => {
    cell.border = { top: style, left: style, bottom: style, right: style };
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function cleanTextValue(value) {
  if (value === undefined || value === null) return "-";
  const s = String(value);
  return s.trim() === "" ? "-" : s;
}

function quantityCellValue(value) {
  if (value === undefined || value === null || value === "") return "-";
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return "-";
  return n;
}

/**
 * Builds and downloads a styled .xlsx quotation report from the given (already
 * filtered) quotations. Includes a navy title band, filter summary, KPI cards,
 * a formatted data table (with freeze panes, auto-filter, semantic order
 * status colours and Indian currency formatting) and a generated-on footer.
 */
export async function exportQuotationsExcel({ quotations, filters }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Quotation Report");

  ws.columns = REPORT_COLUMN_WIDTHS.map((width) => ({ width }));

  // ── Report title ─────────────────────────────────────────────
  ws.mergeCells("A1:K1");
  const title = ws.getCell("A1");
  title.value = "QUOTATION REPORT";
  title.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3487" } };
  title.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 34;

  // ── Filter summary ───────────────────────────────────────────
  const summaryRows = [
    ["Order Status", filters.orderStatus || "All"],
    ["Division", filters.division || "All"],
    ["Date Range", dateRangeLabel(filters)],
  ];
  summaryRows.forEach(([label, value], i) => {
    const r = 3 + i;
    const labelCell = ws.getCell(`A${r}`);
    const valueCell = ws.getCell(`B${r}`);
    labelCell.value = label;
    labelCell.font = { bold: true, color: { argb: "FF1F3487" } };
    labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F5F9" } };
    labelCell.alignment = { vertical: "middle" };
    valueCell.value = value;
    valueCell.font = { color: { argb: "FF2E3460" } };
    valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF1FD" } };
    valueCell.alignment = { vertical: "middle" };
    ws.getRow(r).height = 20;
  });
  borderBox(ws, 3, 1, 5, 2, THIN_LIGHT);

  // ── KPI cards ────────────────────────────────────────────────
  const totalAmount = quotations.reduce((sum, q) => sum + (Number(q.totalAmount) || 0), 0);

  ws.mergeCells("A7:B7");
  const kpi1Label = ws.getCell("A7");
  kpi1Label.value = "TOTAL QUOTATIONS";
  kpi1Label.font = { bold: true, size: 10, color: { argb: "FF2843AD" } };
  kpi1Label.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF1FD" } };
  kpi1Label.alignment = { horizontal: "center", vertical: "middle" };
  ws.mergeCells("A8:B8");
  const kpi1Value = ws.getCell("A8");
  kpi1Value.value = quotations.length;
  kpi1Value.numFmt = "0";
  kpi1Value.font = { bold: true, size: 16, color: { argb: "FF1F3487" } };
  kpi1Value.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F6FB" } };
  kpi1Value.alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("D7:E7");
  const kpi2Label = ws.getCell("D7");
  kpi2Label.value = "TOTAL AMOUNT";
  kpi2Label.font = { bold: true, size: 10, color: { argb: "FF2843AD" } };
  kpi2Label.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF1FD" } };
  kpi2Label.alignment = { horizontal: "center", vertical: "middle" };
  ws.mergeCells("D8:E8");
  const kpi2Value = ws.getCell("D8");
  kpi2Value.value = totalAmount;
  kpi2Value.numFmt = INR_AMOUNT_FORMAT;
  kpi2Value.font = { bold: true, size: 16, color: { argb: "FF1F3487" } };
  kpi2Value.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F6FB" } };
  kpi2Value.alignment = { horizontal: "right", vertical: "middle" };

  ws.getRow(7).height = 24;
  ws.getRow(8).height = 30;
  borderBox(ws, 7, 1, 8, 2, THIN_LIGHT);
  borderBox(ws, 7, 4, 8, 5, THIN_LIGHT);

  // ── Data table header ────────────────────────────────────────
  const headerRow = 10;
  const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3487" } };
  REPORT_HEADERS.forEach((header, i) => {
    const cell = ws.getCell(headerRow, i + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = headerFill;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = { top: THIN_LIGHT, left: THIN_LIGHT, bottom: THIN_LIGHT, right: THIN_LIGHT };
  });
  ws.getRow(headerRow).height = 26;

  // ── Data rows ────────────────────────────────────────────────
  const dataAlignment = [
    { horizontal: "left", vertical: "middle" },
    { horizontal: "left", vertical: "middle" },
    { horizontal: "center", vertical: "middle" },
    { horizontal: "center", vertical: "middle" },
    { horizontal: "center", vertical: "middle" },
    { horizontal: "center", vertical: "middle" },
    { horizontal: "center", vertical: "middle" },
    { horizontal: "right", vertical: "middle" },
    { horizontal: "left", vertical: "middle", wrapText: true },
    { horizontal: "left", vertical: "middle", wrapText: true },
    { horizontal: "center", vertical: "middle" },
  ];

  let dataRowIndex = headerRow + 1;

  quotations.forEach((q) => {
    const itemRows =
      Array.isArray(q.items) && q.items.length > 0
        ? q.items
        : [{ partNumber: "-", description: "-", quantity: "-" }];

    itemRows.forEach((item) => {
      const r = dataRowIndex;
      dataRowIndex += 1;

      const shade = (r - headerRow - 1) % 2 === 1;
      const rowFill = shade
        ? { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F6FB" } }
        : null;

      const values = [
        q.quotationNo,
        q.customerName,
        q.contactNumber,
        q.division,
        Number.isFinite(Number(q.numberOfFollowup)) ? Number(q.numberOfFollowup) : (q.numberOfFollowup || ""),
        q.orderStatus,
        formatDate(q.quotationDate),
        Number(q.totalAmount) || 0,
        cleanTextValue(item.partNumber),
        cleanTextValue(item.description),
        quantityCellValue(item.quantity),
      ];

      values.forEach((value, c) => {
        const cell = ws.getCell(r, c + 1);
        cell.value = value;
        cell.alignment = dataAlignment[c];
        cell.border = { top: THIN_GRAY, left: THIN_GRAY, bottom: THIN_GRAY, right: THIN_GRAY };
        if (rowFill) cell.fill = rowFill;

        if (c === 5) {
          // Semantic order status chip
          const key = String(value || "").trim().toLowerCase();
          const style = STATUS_STYLES[key] || STATUS_STYLES.fallback;
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: style.fill } };
          cell.font = { bold: true, color: { argb: style.color } };
        } else if (c === 7) {
          cell.numFmt = INR_AMOUNT_FORMAT;
          cell.font = { bold: true, color: { argb: "FF1F3487" } };
        }
      });

      ws.getRow(r).height = 20;
    });
  });

  const lastDataRow = dataRowIndex - 1;

  // ── Generated footer ─────────────────────────────────────────
  if (quotations.length > 0) {
    const footerRow = lastDataRow + 2;
    const footer = ws.getCell(`A${footerRow}`);
    footer.value = `Generated On: ${formatReportDate(new Date())}`;
    footer.font = { size: 9, color: { argb: "FF9BA1C1" } };
  }

  // Freeze the report header (row 10) and enable the column auto-filter.
  ws.views = [{ state: "frozen", ySplit: headerRow }];
  ws.autoFilter = { from: `A${headerRow}`, to: `K${Math.max(headerRow, lastDataRow)}` };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, buildReportFileName(filters));
}
