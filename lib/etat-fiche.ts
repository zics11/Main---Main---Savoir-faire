/**
 * État d'une fiche tel qu'il s'affiche dans l'admin : même vocabulaire et
 * mêmes couleurs dans la liste et dans la barre d'enregistrement.
 */
export type EtatFiche = {
  teinte: "en-ligne" | "a-valider" | "hors-ligne" | "en-cours" | "bloquee";
  titre: string;
  detail: string;
};

export function etatFiche(fiche: {
  publiee: boolean;
  bloqueeLe: Date | null;
  publicationDemandeeLe: Date | null;
  premiereValidationLe: Date | null;
  manquants: string[];
}): EtatFiche {
  if (fiche.bloqueeLe) {
    return {
      teinte: "bloquee",
      titre: "Fiche bloquée",
      detail:
        "Retirée du site ; le blocage se lève dans l'onglet Administration.",
    };
  }
  if (fiche.publiee) {
    return {
      teinte: "en-ligne",
      titre: "En ligne",
      detail:
        "Visible de tout le monde. Décochez « Fiche visible » pour la retirer du site.",
    };
  }
  if (fiche.publicationDemandeeLe) {
    return {
      teinte: "a-valider",
      titre: "À valider : il demande la publication",
      detail: `Demande reçue le ${fiche.publicationDemandeeLe.toLocaleDateString("fr-FR")}. Le bouton « Publier la fiche » la met en ligne.`,
    };
  }
  if (fiche.manquants.length) {
    return {
      teinte: "en-cours",
      titre: "En cours de remplissage",
      detail: `Publication impossible : il manque ${fiche.manquants.join(", ")}.`,
    };
  }
  return fiche.premiereValidationLe
    ? {
        teinte: "hors-ligne",
        titre: "Hors ligne",
        detail:
          "Déjà validée par le passé. Cochez « Fiche visible » pour la remettre en ligne.",
      }
    : {
        teinte: "en-cours",
        titre: "Pas encore publiée",
        detail: "Aucune demande du transmetteur ; vous pouvez la publier.",
      };
}

/**
 * Le même état, dit au transmetteur : mêmes couleurs que dans l'admin, mais
 * ce qu'il peut faire, lui.
 */
export function etatFicheTransmetteur(fiche: {
  publiee: boolean;
  bloqueeLe: Date | null;
  publicationDemandeeLe: Date | null;
  premiereValidationLe: Date | null;
  manquants: string[];
}): EtatFiche {
  if (fiche.bloqueeLe) {
    return {
      teinte: "bloquee",
      titre: "Votre fiche est suspendue",
      detail: "L'association l'a retirée du site. Écrivez-lui pour en savoir plus.",
    };
  }
  if (fiche.publiee) {
    return {
      teinte: "en-ligne",
      titre: "Votre fiche est en ligne",
      detail: "Vos modifications sont visibles dès l'enregistrement.",
    };
  }
  if (fiche.publicationDemandeeLe) {
    return {
      teinte: "a-valider",
      titre: "Demande de publication envoyée",
      detail: "L'association relit votre fiche avant de la mettre en ligne.",
    };
  }
  if (fiche.premiereValidationLe) {
    return {
      teinte: "hors-ligne",
      titre: "Votre fiche est hors ligne",
      detail: "Elle n'est plus visible sur le site ; vous pouvez la remettre en ligne en haut de la page.",
    };
  }
  return {
    teinte: "en-cours",
    titre: "Votre fiche n'est pas encore en ligne",
    detail: fiche.manquants.length
      ? `Il reste à renseigner ${fiche.manquants.join(", ")}.`
      : "Demandez sa publication en haut de la page.",
  };
}
