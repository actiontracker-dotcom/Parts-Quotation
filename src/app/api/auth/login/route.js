import { NextResponse } from "next/server";
import { getUsers } from "@/lib/services/usersService";
import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/session";

// POST /api/auth/login
//
// Reads the Users sheet, finds the matching Username, compares Password as
// plain text (testing only — no hashing yet), and only issues a session when
// Active is TRUE. The Password is never returned, logged, or included in the
// token.
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0, must-revalidate" };

const GENERIC_ERROR = "Invalid username or password.";

function getString(value) {
  return typeof value === "string" ? value : "";
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Request body must be valid JSON." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const username = getString(body?.username).trim();
  const password = getString(body?.password);

  if (!username || !password) {
    return NextResponse.json(
      { success: false, message: "Username and password are required." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  // Any Users-sheet read problem is reported as a generic failure so internal
  // sheet details are never exposed to the client.
  const users = await getUsers();

  const match = users.find(
    (u) => u.username.trim().toLowerCase() === username.toLowerCase()
  );

  if (!match) {
    return NextResponse.json(
      { success: false, message: GENERIC_ERROR },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  // Passwords are intentionally plain text for this testing phase.
  if (String(match.password) !== password) {
    return NextResponse.json(
      { success: false, message: GENERIC_ERROR },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  if (!match.active) {
    return NextResponse.json(
      {
        success: false,
        message: "Your account is not active. Please contact the administrator.",
      },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const token = createSessionToken({ username: match.username, active: true });

  const response = NextResponse.json(
    {
      success: true,
      user: { username: match.username, active: true },
    },
    { headers: NO_STORE_HEADERS }
  );

  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());

  return response;
}