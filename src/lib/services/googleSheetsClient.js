import crypto from "node:crypto";
import https from "https";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

let cachedToken = null;
let tokenExpiresAt = 0;
const CLOCK_SKEW_S = 300;

function getSheetId() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    throw new Error("Missing GOOGLE_SHEET_ID environment variable.");
  }
  return sheetId;
}

function base64url(buf) {
  return buf.toString("base64url");
}

function signJWT(payload, privateKeyPem) {
  const header = JSON.stringify({ alg: "RS256", typ: "JWT" });
  const h = base64url(Buffer.from(header));
  const p = base64url(Buffer.from(JSON.stringify(payload)));
  const input = `${h}.${p}`;
  const sig = crypto.createSign("RSA-SHA256").update(input).sign(privateKeyPem, "base64url");
  return `${input}.${sig}`;
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < tokenExpiresAt - CLOCK_SKEW_S) return cachedToken;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !rawKey) {
    throw new Error(
      "Missing Google service account credentials. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY."
    );
  }

  const privateKey = rawKey.replace(/\\n/g, "\n");

  const jwt = signJWT(
    {
      iss: email,
      scope: SCOPE,
      aud: TOKEN_URL,
      exp: now + 3600,
      iat: now,
    },
    privateKey
  );

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `Token error: ${data.error || "unknown"}: ${data.error_description || res.statusText}`
    );
  }

  cachedToken = data.access_token;
  tokenExpiresAt = now + data.expires_in;
  return cachedToken;
}

const AGENT = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 50,
  maxFreeSockets: 10,
  scheduling: "lifo",
});

async function sheetsFetch(path, options = {}) {
  const token = await getAccessToken();
  const url = `${SHEETS_BASE}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    agent: AGENT,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Sheets API error (${res.status}): ${body}`);
  }

  return res.json();
}

export async function prewarmAuth() {
  await getAccessToken();
}

export async function readSheetRange(sheetTab, range) {
  const rangeStr = range ? `${sheetTab}!${range}` : `'${sheetTab}'`;
  const data = await sheetsFetch(
    `/${getSheetId()}/values/${encodeURIComponent(rangeStr)}`
  );
  return data.values || [];
}

export async function appendSheetRows(sheetTab, rows) {
  await sheetsFetch(
    `/${getSheetId()}/values/${encodeURIComponent(`${sheetTab}!A1`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      body: JSON.stringify({ values: rows, majorDimension: "ROWS" }),
    }
  );
}

export async function updateSheetRow(sheetTab, range, values) {
  await sheetsFetch(
    `/${getSheetId()}/values/${encodeURIComponent(`${sheetTab}!${range}`)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      body: JSON.stringify({ values, majorDimension: "ROWS" }),
    }
  );
}

export async function clearSheetRange(sheetTab, range) {
  await sheetsFetch(
    `/${getSheetId()}/values/${encodeURIComponent(`${sheetTab}!${range}`)}:clear`,
    {
      method: "POST",
      body: "{}",
    }
  );
}

export async function batchGetSheets(ranges) {
  const qs = ranges
    .map((r) => `ranges=${encodeURIComponent(r)}`)
    .join("&");
  const data = await sheetsFetch(
    `/${getSheetId()}/values:batchGet?${qs}`
  );
  return (data.valueRanges || []).map((vr) => vr.values || []);
}
