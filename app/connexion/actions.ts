"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function requestMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email || !email.includes("@")) {
    redirect("/connexion?erreur=email");
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  // Only send a link to accounts that already exist (admin, or a
  // transmetteur invited by admin) — there is no public self sign-up.
  if (existing) {
    await signIn("nodemailer", {
      email,
      redirectTo: "/apres-connexion",
      redirect: false,
    });
  }

  // Redirect identically either way, so the response never reveals whether
  // an account exists for that address.
  redirect("/connexion/verifiez-vos-mails");
}
