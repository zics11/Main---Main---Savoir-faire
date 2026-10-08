"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { cookies } from "next/headers";
import { CodeInvalide, CodeRequis, signIn, TropDeTentatives } from "@/lib/auth";
import { COOKIE_PRE_AUTH, creerPreuve } from "@/lib/pre-auth";

/**
 * Ce que la tentative renvoie au formulaire : une erreur à afficher, et le
 * cas échéant le passage au second écran. Rien n'est renvoyé en cas de
 * réussite — `signIn` emmène alors ailleurs.
 *
 * L'état remplace les anciens allers-retours par l'URL (?erreur=…) : la
 * connexion peut ainsi se jouer entièrement dans une fenêtre modale, sans
 * quitter la page où l'on se trouve.
 */
export type EtatConnexion = {
  erreur?: "identifiants" | "code" | "trop_de_tentatives";
  etape?: "code";
  /** Adresse saisie : React vide le formulaire après l'action, on la
   *  réaffiche pour n'avoir à retaper que le mot de passe. */
  email?: string;
} | null;

export async function connexion(
  _precedent: EtatConnexion,
  formData: FormData,
): Promise<EtatConnexion> {
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
    return null;
  } catch (e) {
    // signIn redirige en levant une erreur : seules les erreurs Auth.js sont
    // à traiter ici, le reste (dont la redirection) doit remonter.
    if (
      e instanceof CredentialsSignin &&
      e.code === new TropDeTentatives().code
    ) {
      return { erreur: "trop_de_tentatives", email };
    }
    // Mot de passe bon : on demande le code, en gardant l'adresse pour
    // n'avoir à ressaisir que le nécessaire.
    if (e instanceof CredentialsSignin && e.code === new CodeRequis().code) {
      boite.set(COOKIE_PRE_AUTH, creerPreuve(email.trim().toLowerCase()), {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 300,
        path: "/",
      });
      return { etape: "code", email };
    }
    if (e instanceof CredentialsSignin && e.code === new CodeInvalide().code) {
      return { etape: "code", erreur: "code", email };
    }
    if (e instanceof AuthError) {
      // Même message que le compte existe ou non.
      return { erreur: "identifiants", email };
    }
    throw e;
  }
}
