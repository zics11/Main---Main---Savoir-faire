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

export function alerteAdresseEmailHtml(nouvelle: string) {
  return layout(
    `Une demande de changement d'adresse vient d'être déposée sur votre compte Main à Main, vers <strong>${escapeHtml(nouvelle)}</strong>.<br><br><strong>Si ce n'est pas vous</strong>, prévenez l'association tout de suite : quelqu'un a peut-être accès à votre compte. Rien n'est changé pour l'instant, et vous continuez à vous connecter avec cette adresse.`,
    new URL("/connexion", process.env.AUTH_URL ?? "http://localhost:3000").toString(),
    "Accéder à mon espace"
  );
}

export function alerteAdresseEmailText(nouvelle: string) {
  return `Demande de changement d'adresse sur votre compte\n\nUne demande vers ${nouvelle} vient d'être déposée sur votre compte Main à Main.\n\nSi ce n'est pas vous, prévenez l'association tout de suite : quelqu'un a peut-être accès à votre compte. Rien n'est changé pour l'instant.`;
}

export function ficheEnLigneHtml(ficheNom: string, ficheUrl: string) {
  return layout(
    `Bonne nouvelle : votre fiche <strong>${escapeHtml(ficheNom)}</strong> est désormais en ligne sur Main à Main. Les apprenants peuvent la trouver et vous écrire.<br><br>Vous pouvez la modifier à tout moment depuis votre espace : vos changements sont visibles dès l'enregistrement.`,
    ficheUrl,
    "Voir ma fiche"
  );
}

export function ficheEnLigneText(ficheNom: string, ficheUrl: string) {
  return `Votre fiche est en ligne\n\nVotre fiche ${ficheNom} est désormais visible sur Main à Main :\n${ficheUrl}\n\nVous pouvez la modifier à tout moment depuis votre espace ; vos changements sont visibles dès l'enregistrement.`;
}

export function changementEmailHtml(ficheNom: string, url: string) {
  return layout(
    `Une nouvelle adresse email a été enregistrée pour votre espace Main à Main (<strong>${escapeHtml(ficheNom)}</strong>). Confirmez-la pour qu'elle devienne votre identifiant de connexion.<br><br>Tant que vous n'avez pas cliqué, votre ancienne adresse continue de fonctionner. Ce lien est valable 7 jours.`,
    url,
    "Confirmer cette adresse"
  );
}

export function changementEmailText(ficheNom: string, url: string) {
  return `Confirmez votre nouvelle adresse email\n\nUne nouvelle adresse a été enregistrée pour votre espace Main à Main (${ficheNom}). Confirmez-la pour qu'elle devienne votre identifiant de connexion :\n${url}\n\nTant que vous n'avez pas cliqué, votre ancienne adresse continue de fonctionner. Lien valable 7 jours.`;
}

export function reinitialisationHtml(url: string) {
  return layout(
    `Vous avez demandé à choisir un nouveau mot de passe pour votre espace Main à Main. Ce lien est valable 2 heures et ne sert qu'une fois.<br><br>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe actuel reste valable.`,
    url,
    "Choisir un nouveau mot de passe"
  );
}

export function reinitialisationText(url: string) {
  return `Nouveau mot de passe Main à Main\n\nVous avez demandé à choisir un nouveau mot de passe. Ce lien est valable 2 heures et ne sert qu'une fois :\n${url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe actuel reste valable.`;
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
