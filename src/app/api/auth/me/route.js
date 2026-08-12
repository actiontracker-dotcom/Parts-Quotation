import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";

// GET /api/auth/me
//
// Returns the currently authenticated user's username and active status.
// The password is never included in any response.
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0, must-revalidate" };

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Unauthorized." },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json(
    { success: true, user: { username: user.username, active: user.active } },
    { headers: NO_STORE_HEADERS }
  );
}