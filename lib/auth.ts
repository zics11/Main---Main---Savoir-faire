import { eq } from "drizzle-orm";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { effacerEchecs, estBloque, noterEchec } from "@/lib/limite-connexion";
import { obtenirEmpreinteFactice, verifierMotDePasse } from "@/lib/password";

/** Trop d'échecs récents sur cette adresse — distingué pour l'afficher. */
export class TropDeTentatives extends CredentialsSignin {
  code = "trop_de_tentatives";
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
      },
      async authorize(credentials) {
        const email = String(credentials.email ?? "").trim().toLowerCase();
        const motDePasse = String(credentials.password ?? "");
        if (!email || !motDePasse) return null;
        if (estBloque(email)) throw new TropDeTentatives();

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        // On vérifie toujours une empreinte, même factice, pour que le temps
        // de réponse ne révèle pas si le compte existe.
        const valide = await verifierMotDePasse(
          motDePasse,
          user?.passwordHash ?? (await obtenirEmpreinteFactice())
        );

        if (!user?.passwordHash || !valide) {
          noterEchec(email);
          return null;
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
