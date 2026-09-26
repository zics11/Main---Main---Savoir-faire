"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CodeInvalide, CodeRequis, signIn, TropDeTentatives } from "@/lib/auth";
import { COOKIE_PRE_AUTH, creerPreuve } from "@/lib/pre-auth";

export async function loginWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const boite = await cookies();

  try {
    await signIn("credentials", {
      email,
      password: String(formData.get("password") ?? ""),
      code: String(formData.get("code") ?? ""),
      // Présente au second écran seulement : elle remplace le mot de passe
      // déjà vérifié, pour ne pas le redemander.
      preuve: boite.get(COOKIE_PRE_AUTH)?.value ?? "",
      redirectTo: "/apres-connexion",
    });
  } catch (e) {
    // signIn redirige en levant une erreur : seules les erreurs Auth.js sont
    // à traiter ici, le reste (dont la redirection) doit remonter.
    if (e instanceof CredentialsSignin && e.code === new TropDeTentatives().code) {
      redirect("/connexion?erreur=trop_de_tentatives");
    }
    // Mot de passe bon : on redemande la page avec le champ du code, en
    // gardant l'adresse pour n'avoir à ressaisir que le nécessaire.
    if (e instanceof CredentialsSignin && e.code === new CodeRequis().code) {
      boite.set(COOKIE_PRE_AUTH, creerPreuve(email.trim().toLowerCase()), {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 300,
        path: "/",
      });
      redirect(`/connexion?etape=code&email=${encodeURIComponent(email)}`);
    }
    if (e instanceof CredentialsSignin && e.code === new CodeInvalide().code) {
      redirect(
        `/connexion?etape=code&erreur=code&email=${encodeURIComponent(email)}`
      );
    }
    if (e instanceof AuthError) {
      // Même message que le compte existe ou non.
      redirect("/connexion?erreur=identifiants");
    }
    throw e;
  }
}
