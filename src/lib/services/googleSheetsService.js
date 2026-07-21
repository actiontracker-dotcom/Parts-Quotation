import { google } from "googleapis";

// Server-only module. Never import this from a client component -
// it reads service-account credentials from process.env.

const SHEET_TAB = process.env.GOOGLE_SHEET_TAB || "Quotations";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !rawKey) {
    throw new Error(
      "Missing Google service account credentials. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY."
    );
  }

  const privateKey = rawKey.replace(/\\n/g, "\n");

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheetsClient() {
  const auth = getAuth();
  return google.sheets({ version: "v4", auth });
}

/**
 * Flattens a validated quotation (customer + quotation meta + items) into
 * the row layout stored in the Google Sheet. One row per line item, with
 * a shared quotationId so rows can be grouped back together later.
 */
export function buildQuotationRows(quotation, { quotationId, createdAt }) {
  const { customer, quotation: info, items } = quotation;

  return items.map((item) => [
    quotationId,
    createdAt,
    customer.customerName,
    customer.fullAddressGst,
    customer.contactPerson,
    customer.contactNumber,
    customer.designation || "",
    customer.emailTo,
    customer.emailCc || "",
    customer.location || "",
    customer.engineerRemark || "",
    customer.userId,
    info.division,
    info.sourceOfEnquiry,
    info.enquiryGeneratedBy,
    info.quotationDate,
    info.partyReferenceNumber || "",
    info.partyReferenceDate || "",
    info.paymentTerms,
    info.quotationValidity,
    info.termsOfDelivery,
    info.quotationFollowUpBy || "",
    info.reviseNumber || "",
    item.partNumber,
    item.partDescription,
    item.quantity,
    item.unitPrice,
    item.otherRate || 0,
    item.discount || 0,
    item.availability || "",
    item.priceWef || "",
    item.liveStock || "",
  ]);
}

export async function appendQuotation(quotation, meta) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    throw new Error("Missing GOOGLE_SHEET_ID environment variable.");
  }

  const rows = buildQuotationRows(quotation, meta);
  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${SHEET_TAB}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });

  return { rowsWritten: rows.length };
}
