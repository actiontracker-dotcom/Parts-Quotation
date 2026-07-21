const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function formatCurrency(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return INR_FORMATTER.format(0);
  return INR_FORMATTER.format(number);
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
