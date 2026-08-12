import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

// /login is publicly accessible, but an already-authenticated user who opens it
// is redirected straight to /dashboard.
export default async function LoginLayout({ children }) {
  const user = await getSessionUser();

  if (user) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}