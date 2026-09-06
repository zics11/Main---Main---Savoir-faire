import "server-only";
import { createTransport } from "nodemailer";

const transport = createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendMail(opts: {
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
}) {
  const result = await transport.sendMail({
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
