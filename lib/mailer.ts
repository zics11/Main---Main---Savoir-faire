import "server-only";
import { createTransport, type Transporter } from "nodemailer";

// Le transport est construit à la demande et reconstruit dès que la
// configuration change. Le créer une fois pour toutes au chargement du module
// le figeait : une modification des réglages SMTP restait sans effet tant que
// le serveur tournait, et les emails partaient vers l'ancienne adresse.
let transport: Transporter | null = null;
let configuration = "";

function obtenirTransport() {
  const reglages = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  const signature = `${reglages.host}:${reglages.port}:${reglages.auth.user}`;
  if (!transport || signature !== configuration) {
    transport = createTransport(reglages);
    configuration = signature;
  }
  return transport;
}

export async function sendMail(opts: {
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
}) {
  const result = await obtenirTransport().sendMail({
    to: opts.to,
    replyTo: opts.replyTo,
    from: process.env.SMTP_FROM,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
  const failed = result.rejected.concat(result.pending).filter(Boolean);
  if (failed.length) {
    throw new Error(`L'email n'a pas pu être envoyé à ${failed.join(", ")}`);
  }
}
