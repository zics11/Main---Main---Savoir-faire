import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import { db } from "@/lib/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/lib/db/schema";
import { magicLinkEmailHtml, magicLinkEmailText } from "@/lib/email";
import { sendMail } from "@/lib/mailer";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "database" },
  pages: {
    signIn: "/connexion",
    verifyRequest: "/connexion/verifiez-vos-mails",
  },
  providers: [
    Nodemailer({
      // required by the provider even though sendVerificationRequest below
      // sends mail through lib/mailer.ts instead of this config directly
      server: { host: process.env.SMTP_HOST },
      from: process.env.SMTP_FROM,
      async sendVerificationRequest({ identifier, url }) {
        await sendMail({
          to: identifier,
          subject: "Votre lien de connexion — Main à Main",
          text: magicLinkEmailText(url),
          html: magicLinkEmailHtml(url),
        });
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      session.user.role = user.role;
      return session;
    },
  },
});
