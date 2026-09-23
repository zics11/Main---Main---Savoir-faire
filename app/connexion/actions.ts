"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, TropDeTentatives } from "@/lib/auth";

export async function loginWithPassword(formData: FormData) {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/apres-connexion",
    });
  } catch (e) {
    // signIn redirige en levant une erreur : seules les erreurs Auth.js sont
    // à traiter ici, le reste (dont la redirection) doit remonter.
    if (e instanceof CredentialsSignin && e.code === new TropDeTentatives().code) {
      redirect("/connexion?erreur=trop_de_tentatives");
    }
    if (e instanceof AuthError) {
      // Même message que le compte existe ou non.
      redirect("/connexion?erreur=identifiants");
    }
    throw e;
  }
}
