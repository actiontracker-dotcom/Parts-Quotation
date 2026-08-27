const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

export function formatDate(dateString) {
  if (!dateString) return "";
  
  // Handle DD/MM/YYYY format (canonical format used in this app)
  const ddmmyyyyMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, d, m, y] = ddmmyyyMatch.map(Number);
    const day = String(d).padStart(2, '0');
    const month = String(m).padStart(2, '0');
    const year = y;
    return `${day}/${month}/${year}`;
  }
  
  // Handle YYYY-MM-DD format (HTML date input)
  const yyyymmddMatch = dateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (yyyymmddMatch) {
    const [, y, m, d] = yyyymmddMatch.map(Number);
    const day = String(d).padStart(2, '0');
    const month = String(m).padStart(2, '0');
    const year = y;
    return `${day}/${month}/${year}`;
  }
  
  // Fallback to standard Date parsing for other formats
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Renders a timestamp as "08 Aug 2026, 10:10 AM". Falls back to the raw value
// when the input is not a parseable date.
export function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTH_SHORT[date.getMonth()];
  const year = date.getFullYear();
  let hours = date.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
}

export function formatCurrency(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return INR_FORMATTER.format(0);
  return INR_FORMATTER.format(number);
}

function trimTrailingZeros(value) {
  const s = String(value);
  if (!s.includes(".")) return s;
  return s.replace(/\.?0+$/, "");
}

// Compact Indian notation for dashboard KPIs/charts: ₹1.25 Cr, ₹14.25 L, ₹7.5 K.
// Uses Indian numbering (lakh/crore) which plain latin abbreviations miss.
export function formatCompactCurrency(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "₹0";
  const abs = Math.abs(number);
  if (abs >= 10000000) return `₹${trimTrailingZeros((number / 10000000).toFixed(2))} Cr`;
  if (abs >= 100000) return `₹${trimTrailingZeros((number / 100000).toFixed(2))} L`;
  if (abs >= 1000) return `₹${trimTrailingZeros((number / 1000).toFixed(1))} K`;
  return `₹${trimTrailingZeros(INR_FORMATTER.format(number))}`;
}

export function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function computeLineTotal(item) {
  const quantity = toNumber(item.quantity);
  const unitPrice = toNumber(item.unitPrice);
  const otherRate = toNumber(item.otherRate);
  const discountPercent = toNumber(item.discount);

  const base = quantity * (unitPrice + otherRate);
  const discountAmount = base * (discountPercent / 100);
  return Math.max(base - discountAmount, 0);
}

// GST Amount per item = (Taxable Amount × GST Rate) / 100.
// Taxable amount for a line is its line total (after discount).
// GST Rate defaults to the business rule (18%) when blank/missing so existing
// quotations recalculate correctly.
export function computeGstAmount(item, gstRateOverride) {
  const rate = gstRateOverride !== undefined && gstRateOverride !== null
    ? toNumber(gstRateOverride)
    : toNumber(item.gstRate) || 18;
  return Math.round((computeLineTotal(item) * rate) / 100 * 100) / 100;
}

export function computeQuotationTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + toNumber(item.quantity) * toNumber(item.unitPrice), 0);
  const otherCharges = items.reduce((sum, item) => sum + toNumber(item.quantity) * toNumber(item.otherRate), 0);
  const discountTotal = items.reduce((sum, item) => {
    const base = toNumber(item.quantity) * (toNumber(item.unitPrice) + toNumber(item.otherRate));
    return sum + base * (toNumber(item.discount) / 100);
  }, 0);
  const grandTotal = items.reduce((sum, item) => sum + computeLineTotal(item), 0);

  return { subtotal, otherCharges, discountTotal, grandTotal, itemCount: items.length };
}
