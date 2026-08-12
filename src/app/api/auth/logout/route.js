import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";

// POST /api/auth/logout
//
// Invalidates the authenticated session by expiring the cookie immediately.
// Idempotent: works even without a valid session.
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0, must-revalidate" };

export async function POST() {
  const response = NextResponse.json(
    { success: true },
    { headers: NO_STORE_HEADERS }
  );

  response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions({ maxAge: 0 }));

  return response;
}