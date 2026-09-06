const jourMois = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
const jourSeul = new Intl.DateTimeFormat("fr-FR", { day: "numeric" });

/** "8–9 août" for a range within the same month, "8 août – 3 sept." otherwise. */
export function formatDateRange(debut: Date, fin: Date) {
  if (debut.toDateString() === fin.toDateString()) {
    return jourMois.format(debut);
  }
  if (
    debut.getMonth() === fin.getMonth() &&
    debut.getFullYear() === fin.getFullYear()
  ) {
    return `${jourSeul.format(debut)}–${jourMois.format(fin)}`;
  }
  return `${jourMois.format(debut)} – ${jourMois.format(fin)}`;
}
