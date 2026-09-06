import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";

// Auth.js redirects the magic-link click here; role isn't known until the
// session exists, so the split by role happens in this one server-only hop.
export default async function ApresConnexionPage() {
  const user = await requireUser();
  redirect(user.role === "admin" ? "/admin" : "/mes-stages");
}
