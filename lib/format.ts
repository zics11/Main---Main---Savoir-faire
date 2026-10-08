const jourDeDepart = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "long",
});

/**
 * La durée d'un stage : celle saisie une fois pour toutes sur le stage, et
 * donc commune à toutes ses dates. Faute de durée renseignée, on la compte
 * d'après la date de fin.
 */
export function dureeDuStage(debut: Date, fin: Date, duree: string | null) {
  if (duree?.trim()) return duree.trim();
  // Écart calculé sur les dates seules : un changement d'heure ne doit pas
  // le fausser.
  const jours =
    Math.round(
      (Date.UTC(fin.getFullYear(), fin.getMonth(), fin.getDate()) -
        Date.UTC(debut.getFullYear(), debut.getMonth(), debut.getDate())) /
        86_400_000,
    ) + 1;
  return jours <= 1 ? "1 jour" : `${jours} jours`;
}

/**
 * Une date de stage telle qu'on l'annonce : le jour où il commence et sa
 * durée — « sam. 14 novembre · 2 jours ». La date de fin ne s'écrit pas :
 * elle découle de la durée, et la répéter n'apprend rien.
 */
export function formatDebutEtDuree(
  debut: Date,
  fin: Date,
  duree: string | null,
) {
  return `${jourDeDepart.format(debut)} · ${dureeDuStage(debut, fin, duree)}`;
}
