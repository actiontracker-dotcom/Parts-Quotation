const WORDS = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function convertBelowThousand(n) {
  if (n === 0) return "";
  const parts = [];
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h) parts.push(WORDS[h] + " Hundred");
  if (r > 0) {
    if (r < 20) parts.push(WORDS[r]);
    else parts.push(TENS[Math.floor(r / 10)] + (r % 10 ? " " + WORDS[r % 10] : ""));
  }
  return parts.join(" ");
}

export function amountInWords(amount) {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) return "Zero";
  if (amount === 0) return "Zero";

  const num = Math.round(amount * 100);
  const rupees = Math.floor(num / 100);
  const paise = num % 100;

  if (rupees === 0 && paise === 0) return "Zero";

  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = rupees % 1000;

  const parts = [];
  if (crore) parts.push(convertBelowThousand(crore) + " Crore");
  if (lakh) parts.push(convertBelowThousand(lakh) + " Lakh");
  if (thousand) parts.push(convertBelowThousand(thousand) + " Thousand");
  if (hundred) parts.push(convertBelowThousand(hundred));

  const rupeePart = parts.join(" ");
  const paisePart = paise > 0 ? " and " + convertBelowThousand(paise) + " Paise" : "";

  return "Rupees " + rupeePart + paisePart + " Only";
}
