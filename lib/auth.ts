import { eq } from "drizzle-orm";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { effacerEchecs, estBloque, noterEchec } from "@/lib/limite-connexion";
import { obtenirEmpreinteFactice, verifierMotDePasse } from "@/lib/password";
import { preuveValable } from "@/lib/pre-auth";
import { consommerCodeDeSecours } from "@/lib/totp-comptes";
import { verifierCodeTotp } from "@/lib/totp";

/** Trop d'échecs récents sur cette adresse — distingué pour l'afficher. */
export class TropDeTentatives extends CredentialsSignin {
  code = "trop_de_tentatives";
}

/** Mot de passe bon, mais le compte réclame son code à usage unique. */
export class CodeRequis extends CredentialsSignin {
  code = "code_requis";
}

/** Code à usage unique absent ou faux. */
export class CodeInvalide extends CredentialsSignin {
  code = "code_invalide";
}

/**
 * Connexion par email + mot de passe, et rien d'autre : pas de lien magique.
 * Un transmetteur reçoit son mot de passe dans son invitation (lib/fiche.ts)
 * et l'admin peut lui en renvoyer un depuis sa fiche ; les comptes se
 * dépannent donc sans jeton ni lien à usage unique.
 *
 * Sessions en JWT : Auth.js n'accepte pas les sessions en base avec un
 * provider Credentials. Pas d'adaptateur non plus — la table users est lue
 * directement ci-dessous.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/connexion" },
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
        code: { type: "text" },
        preuve: { type: "text" },
      },
      async authorize(credentials) {
        const email = String(credentials.email ?? "").trim().toLowerCase();
        const motDePasse = String(credentials.password ?? "");
        // Second écran de la connexion : le mot de passe a déjà été vérifié,
        // une preuve signée en tient lieu le temps de saisir le code.
        const preuve = String(credentials.preuve ?? "");
        const premierFacteurDejaFait = preuve !== "" && preuveValable(preuve, email);
        if (!email || (!motDePasse && !premierFacteurDejaFait)) return null;
        if (estBloque(email)) throw new TropDeTentatives();

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        // On vérifie toujours une empreinte, même factice, pour que le temps
        // de réponse ne révèle pas si le compte existe.
        const valide =
          premierFacteurDejaFait ||
          (await verifierMotDePasse(
            motDePasse,
            user?.passwordHash ?? (await obtenirEmpreinteFactice())
          ));

        if (!user?.passwordHash || !valide) {
          noterEchec(email);
          return null;
        }

        // Second facteur : seulement si l'activation a été confirmée par un
        // premier code. Un enrôlement abandonné ne doit bloquer personne.
        if (user.totpActiveLe && user.totpSecret) {
          const code = String(credentials.code ?? "").trim();
          if (!code) throw new CodeRequis();
          const bon =
            verifierCodeTotp(user.totpSecret, code) ||
            (await consommerCodeDeSecours(user.id, code));
          if (!bon) {
            noterEchec(email);
            throw new CodeInvalide();
          }
        }

        effacerEchecs(email);
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      if (!token.sub) return null;

      // Relu en base à chaque requête : un compte supprimé ou rétrogradé perd
      // ses droits tout de suite, au lieu d'attendre l'expiration du jeton.
      const enBase = await db.query.users.findFirst({
        where: eq(users.id, token.sub),
        columns: { role: true },
      });
      if (!enBase) return null;

      token.role = enBase.role;
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role;
      return session;
    },
  },
});
