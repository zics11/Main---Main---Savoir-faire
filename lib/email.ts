// Branded email templates. Kept separate from lib/mailer.ts (transport) so
// the visual templates can evolve independently of the SMTP wiring.

function layout(bodyHtml: string, ctaHref: string, ctaLabel: string) {
  return `
<div style="background:#faf8f4;padding:40px 24px;font-family:'Work Sans',Arial,sans-serif;color:#2b2620">
  <div style="max-width:440px;margin:0 auto;background:#ffffff;border:1px solid #e8e2d6;border-radius:2px;padding:36px">
    <div style="font-family:Georgia,'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:#2b2620;margin-bottom:24px">
      Main à Main
    </div>
    <p style="font-size:15px;line-height:1.6;margin:0 0 24px">${bodyHtml}</p>
    <a href="${ctaHref}" style="display:inline-block;background:#a3512a;color:#faf8f4;font-size:15px;font-weight:500;padding:14px 28px;border-radius:2px;text-decoration:none">
      ${ctaLabel}
    </a>
  </div>
</div>`.trim();
}

export function inviteEmailHtml(ficheNom: string, activationUrl: string) {
  return layout(
    `Votre fiche transmetteur — <strong>${escapeHtml(ficheNom)}</strong> — vous attend sur Main à Main. Commencez par choisir votre mot de passe : vous arriverez directement sur votre espace, où vous pourrez compléter votre présentation, vos photos et vos stages.<br><br>Ce lien est valable 14 jours. Ensuite, vous vous connecterez avec cette adresse email et le mot de passe choisi.`,
    activationUrl,
    "Choisir mon mot de passe"
  );
}

export function inviteEmailText(ficheNom: string, activationUrl: string) {
  return `Bienvenue sur Main à Main\n\nVotre fiche transmetteur (${ficheNom}) vous attend. Choisissez votre mot de passe pour accéder à votre espace :\n${activationUrl}\n\nCe lien est valable 14 jours. Ensuite, vous vous connecterez avec cette adresse email et le mot de passe choisi.`;
}

export function motDePasseEmailHtml(motDePasse: string, connexionUrl: string) {
  return layout(
    `Voici votre nouveau mot de passe pour Main à Main : <strong style="font-family:monospace;font-size:17px">${escapeHtml(motDePasse)}</strong><br><br>Connectez-vous avec votre adresse email et ce mot de passe. Vous pourrez le remplacer par celui de votre choix depuis « Mon compte ». Le précédent, s'il y en avait un, ne fonctionne plus.`,
    connexionUrl,
    "Me connecter"
  );
}

export function motDePasseEmailText(motDePasse: string, connexionUrl: string) {
  return `Votre nouveau mot de passe Main à Main\n\n${motDePasse}\n\nConnectez-vous avec votre adresse email et ce mot de passe :\n${connexionUrl}\n\nVous pourrez le remplacer depuis « Mon compte ». Le précédent, s'il y en avait un, ne fonctionne plus.`;
}

export function demandePublicationEmailHtml(
  ficheNom: string,
  email: string,
  ficheUrl: string
) {
  return layout(
    `<strong>${escapeHtml(ficheNom)}</strong> (${escapeHtml(email)}) demande la mise en ligne de sa fiche. Elle est complète et n'attend que votre accord — elle reste invisible du public d'ici là.`,
    ficheUrl,
    "Voir la fiche"
  );
}

export function demandePublicationEmailText(
  ficheNom: string,
  email: string,
  ficheUrl: string
) {
  return `Demande de publication\n\n${ficheNom} (${email}) demande la mise en ligne de sa fiche. Elle reste invisible du public tant que vous ne l'avez pas publiée.\n\n${ficheUrl}`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type ContactRequestInfo = {
  ficheNom: string;
  nom: string;
  email: string;
  telephone: string | null;
  provenance: string | null;
  niveau: string | null;
  personnes: number;
  hebergement: boolean;
  offreLabel: string | null;
  dateLabel: string | null;
  message: string;
};

function contactRequestRows(info: ContactRequestInfo): [string, string][] {
  return [
    ["Nom", info.nom],
    ["Email", info.email],
    info.telephone ? (["Téléphone", info.telephone] as const) : null,
    info.provenance ? (["D'où", info.provenance] as const) : null,
    info.niveau ? (["Niveau", info.niveau] as const) : null,
    ["Personnes", String(info.personnes)],
    ["Hébergement", info.hebergement ? "Souhaité" : "Non nécessaire"],
    info.offreLabel ? (["Formule", info.offreLabel] as const) : null,
    ["Dates", info.dateLabel ?? "Souple, à convenir"],
  ].filter((row): row is [string, string] => row !== null);
}

export function contactRequestEmailHtml(info: ContactRequestInfo) {
  const rowsHtml = contactRequestRows(info)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#8a8072;white-space:nowrap;vertical-align:top">${escapeHtml(k)}</td><td style="padding:4px 0;font-weight:500">${escapeHtml(v)}</td></tr>`
    )
    .join("");

  return `
<div style="background:#faf8f4;padding:40px 24px;font-family:'Work Sans',Arial,sans-serif;color:#2b2620">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e8e2d6;border-radius:2px;padding:36px">
    <div style="font-family:Georgia,'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:#2b2620;margin-bottom:8px">
      Main à Main
    </div>
    <p style="font-size:15px;line-height:1.6;margin:0 0 20px">
      Nouvelle demande de contact pour <strong>${escapeHtml(info.ficheNom)}</strong>, via le formulaire du site.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px">${rowsHtml}</table>
    <div style="border-top:1px solid #e8e2d6;padding-top:16px">
      <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#8a8072;margin-bottom:6px">Message</div>
      <p style="font-size:14.5px;line-height:1.65;white-space:pre-line;margin:0">${escapeHtml(info.message)}</p>
    </div>
    <p style="font-size:12.5px;color:#8a8072;margin:20px 0 0">
      Vous pouvez répondre directement à cet email pour contacter ${escapeHtml(info.nom)}.
    </p>
  </div>
</div>`.trim();
}

export function contactRequestEmailText(info: ContactRequestInfo) {
  const lines = [
    `Nouvelle demande de contact pour ${info.ficheNom} via Main à Main`,
    "",
    ...contactRequestRows(info).map(([k, v]) => `${k} : ${v}`),
    "",
    "Message :",
    info.message,
    "",
    `Vous pouvez répondre directement à cet email pour contacter ${info.nom}.`,
  ];
  return lines.join("\n");
}
