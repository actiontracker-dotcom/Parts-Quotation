// Server-only authentication/session helpers.
//
// Sessions are STATELESS: the client holds a single HttpOnly cookie containing a
// signed token (HMAC-SHA256). Nothing is stored server-side, so the session
// survives across serverless instances and server restarts (as long as
// AUTH_SECRET stays the same). The cookie is never readable from client-side
// JavaScript and is never sent back to the browser as JSON.
//
// Passwords are intentionally NOT included in the token, in any API response,
// or in logs. The Users sheet is only read server-side by the login flow.

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const SESSION_COOKIE = "auth_token";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

let fallbackSecret = null;

function getSecret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  // Dev convenience only: without AUTH_SECRET the secret is random per process,
  // so sessions reset on restart. Set AUTH_SECRET for persistent sessions.
  if (!fallbackSecret) {
    fallbackSecret = crypto.randomBytes(32).toString("hex");
    console.warn(
      "[auth] AUTH_SECRET is not set. Using an ephemeral session secret; " +
        "sessions will reset when the server restarts. Set AUTH_SECRET in .env " +
        "for persistent sessions."
    );
  }
  return fallbackSecret;
}

function encodeBase64Url(buf) {
  return buf.toString("base64url");
}

function decodeBase64Url(str) {
  return Buffer.from(str, "base64url");
}

export function createSessionToken(user) {
  const payload = {
    username: user.username,
    active: user.active === true,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encoded = encodeBase64Url(Buffer.from(JSON.stringify(payload)));
  const signature = crypto.createHmac("sha256", getSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== "string") return null;

  const dot = token.lastIndexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;

  const encoded = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expected = crypto.createHmac("sha256", getSecret()).update(encoded).digest("base64url");
  const signatureBuf = Buffer.from(signature, "base64url");
  const expectedBuf = Buffer.from(expected, "base64url");
  if (signatureBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(signatureBuf, expectedBuf)) return null;

  let payload;
  try {
    payload = JSON.parse(decodeBase64Url(encoded).toString("utf8"));
  } catch {
    return null;
  }

  if (!payload.username || typeof payload.exp !== "number") return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return { username: payload.username, active: payload.active === true };
}

// Returns the authenticated user (or null) by reading the session cookie.
// Safe to call from server components, layouts and route handlers.
export async function getSessionUser() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

export function sessionCookieOptions(overrides = {}) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    ...overrides,
  };
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, message: "Unauthorized. Please log in." },
    { status: 401 }
  );
}
