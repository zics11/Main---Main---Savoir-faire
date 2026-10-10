import "server-only";
import { cookies } from "next/headers";
import {
  enEuros,
  lienDon,
  lienEnSavoirPlus,
  lienSoutien,
  MONTANT_PAR_DEFAUT,
  MONTANTS_CONSEILLES,
  TEMOIN_DON,
  type SourceDon,
} from "@/lib/dons";

// Où en sont les dons, et par où ils passent. Aucun moyen de paiement n'est
// branché pour l'instant : l'interface est prête, et le jour venu il suffit
// d'en ajouter un ici (HelloAsso, Stripe…), sans toucher aux pages.
//
//  - « ouverts » : un moyen de paiement est configuré. Tout s'affiche, et
//    chaque email se termine par son encart de don.
//  - « apercu » : rien n'est branché, mais on regarde le rendu — d'office en
//    développement, ou avec DONS_APERCU=1. Tout s'affiche aussi, emails
//    compris ; le bouton « Donner » explique qu'aucun paiement n'est relié.
//  - « fermes » : rien n'est branché, en production. Rien ne s'affiche.

export type EtatDons = "ouverts" | "apercu" | "fermes";

/** Un don tel que le formulaire le demande. */
export type DemandeDon = {
  /** null : pas de montant choisi, il se choisit chez le prestataire. */
  montant: number | null;
  mensuel: boolean;
  source: SourceDon;
  /** La page où revenir une fois le paiement fait. */
  retour: string;
};

/**
 * Un moyen de paiement : il reçoit le don voulu et renvoie l'adresse où le
 * donateur part payer. C'est la seule chose à écrire pour en brancher un.
 */
export type FournisseurDon = {
  nom: string;
  demarrer: (don: DemandeDon) => Promise<string>;
};

/**
 * Le moyen de paiement configuré, s'il y en a un. Le plus simple est prévu :
 * DONS_LIEN, l'adresse d'un formulaire de don tout fait (HelloAsso, lien de
 * paiement Stripe…) ; le montant s'y choisit de nouveau. Un branchement plus
 * fin, montant transmis, passera par l'API du prestataire, ici.
 */
export function fournisseurDon(): FournisseurDon | null {
  const lien = process.env.DONS_LIEN?.trim();
  if (lien) {
    return { nom: "lien", demarrer: async () => lien };
  }
  return null;
}

export function etatDons(): EtatDons {
  if (fournisseurDon()) return "ouverts";
  if (
    process.env.DONS_APERCU === "1" ||
    process.env.NODE_ENV !== "production"
  ) {
    return "apercu";
  }
  return "fermes";
}

/** Le site montre-t-il ses invitations à donner ? */
export function donsVisibles() {
  return etatDons() !== "fermes";
}

/**
 * Les encarts qui demandent un don, après une demande ou un témoignage : pas
 * pour quelqu'un qui vient de donner (témoin posé par la page de
 * remerciement). Les liens discrets — menu, pied de page — restent.
 */
export async function encartsDons() {
  if (!donsVisibles()) return false;
  return !(await cookies()).has(TEMOIN_DON);
}

/**
 * L'encart de don d'un email, sur le modèle de celui du site : un titre, une
 * phrase, les montants — chacun droit au paiement —, « Autre montant » et
 * « En savoir plus ». Null tant que la page Soutenir ne s'affiche pas : les
 * liens mèneraient nulle part.
 */
export type EncartEmail = {
  titre: string;
  texte: string;
  montants: { libelle: string; url: string; conseille: boolean }[];
  autre: string;
  savoirPlus: string;
};

export function encartEmail(
  source: SourceDon,
  options: {
    titre: string;
    texte: string;
    montants?: readonly number[];
    conseille?: number;
    /** Après chaque montant : « / an ». */
    suffixe?: string;
  },
): EncartEmail | null {
  if (!donsVisibles()) return null;
  const {
    titre,
    texte,
    montants = MONTANTS_CONSEILLES,
    conseille = MONTANT_PAR_DEFAUT,
    suffixe = "",
  } = options;
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  const absolu = (chemin: string) => new URL(chemin, base).toString();
  return {
    titre,
    texte,
    montants: montants.map((m) => ({
      libelle: `${enEuros(m)}${suffixe}`,
      url: absolu(lienDon(source, m)),
      conseille: m === conseille,
    })),
    autre: absolu(`${lienSoutien(source)}#faire-un-don`),
    savoirPlus: absolu(lienEnSavoirPlus(source)),
  };
}
