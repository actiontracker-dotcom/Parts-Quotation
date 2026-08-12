import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

// Server-side guard for everything under /dashboard. Unauthenticated visitors
// (no valid HttpOnly session cookie) are redirected to /login before any
// dashboard page renders. This runs on every request, including refreshes and
// client-side navigations, because this layout re-executes server-side.
export default async function DashboardLayout({ children }) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return <>{children}</>;
}