import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  demandesTemoignage,
  stages,
  temoignages,
  type Transmetteur,
} from "@/lib/db/schema";
import { demandeTemoignageHtml, demandeTemoignageText } from "@/lib/email";
import { sendMail } from "@/lib/mailer";

// Les demandes de témoignage : le transmetteur donne le nom et l'adresse
// d'une personne venue en stage, le site lui écrit. Elle reçoit un lien à
// usage unique pour laisser un mot — ou décliner. Aucun contrôle d'accès ici :
// c'est à chaque action de vérifier qui parle.

export class ErreurDemande extends Error {}

/** Combien de temps le lien reste valable. */
const VALIDITE_JOURS = 60;
/** Garde-fou contre un envoi en masse depuis un compte. */
export const DEMANDES_PAR_JOUR = 20;

export const LONGUEUR_MAX_TEMOIGNAGE = 1200;
const LONGUEUR_MAX_NOM = 80;

/** Seule l'empreinte du lien est gardée : une copie de la base n'ouvre aucun formulaire. */
function empreinte(jeton: string) {
  return createHash("sha256").update(jeton).digest("hex");
}

function lien(jeton: string) {
  return new URL(
    `/temoignage/${jeton}`,
    process.env.AUTH_URL ?? "http://localhost:3000",
  ).toString();
}

/** Ce que renvoie l'envoi d'une demande au formulaire qui l'a faite. */
export type EtatDemandeTemoignage =
  | { ok: true; message: string }
  | {
      ok: false;
      erreur: string;
      valeurs: { nom: string; email: string; stageId: string };
    }
  | null;

/** Une demande telle que la liste « Demandes envoyées » l'affiche. */
export type DemandeAffichee = {
  id: string;
  nom: string;
  email: string;
  stage: string | null;
  envoyeeLe: Date;
  expireLe: Date;
  reponse: "temoignage" | "refus" | null;
  /** Le témoignage reçu a été retiré depuis par l'association. */
  retire: boolean;
};

const moisAnnee = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});

/**
 * Envoie une demande au nom de la fiche. Refusée si cette adresse a déjà
 * reçu une demande de cette fiche — quelle qu'en ait été la suite —, ou si
 * le compte a déjà envoyé son lot de la journée.
 */
export async function envoyerDemande(
  fiche: Pick<Transmetteur, "id" | "nom" | "nomLieu" | "email">,
  saisie: { nom: string; email: string; stageId: string | null },
) {
  const nom = saisie.nom.trim();
  const email = saisie.email.trim().toLowerCase();
  if (!nom) throw new ErreurDemande("Indiquez le nom de la personne.");
  if (nom.length > LONGUEUR_MAX_NOM) {
    throw new ErreurDemande("Ce nom est trop long.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ErreurDemande("Cette adresse email ne semble pas valable.");
  }

  // Le stage, s'il est précisé, doit être un stage de cette fiche.
  const stage = saisie.stageId
    ? await db.query.stages.findFirst({
        where: and(
          eq(stages.id, saisie.stageId),
          eq(stages.transmetteurId, fiche.id),
        ),
        columns: { id: true, titre: true },
      })
    : null;
  if (saisie.stageId && !stage) throw new ErreurDemande("Stage introuvable.");

  const deja = await db.query.demandesTemoignage.findFirst({
    where: and(
      eq(demandesTemoignage.transmetteurId, fiche.id),
      eq(demandesTemoignage.email, email),
    ),
    columns: { envoyeeLe: true },
  });
  if (deja) {
    throw new ErreurDemande(
      `Une demande a déjà été envoyée à cette adresse, le ${deja.envoyeeLe.toLocaleDateString("fr-FR")}. On ne relance pas : une seule demande par personne.`,
    );
  }

  const [{ envoyees }] = await db
    .select({ envoyees: sql<number>`count(*)` })
    .from(demandesTemoignage)
    .where(
      and(
        eq(demandesTemoignage.transmetteurId, fiche.id),
        gte(demandesTemoignage.envoyeeLe, new Date(Date.now() - 86_400_000)),
      ),
    );
  if (envoyees >= DEMANDES_PAR_JOUR) {
    throw new ErreurDemande(
      `Vous avez envoyé ${DEMANDES_PAR_JOUR} demandes en 24 heures : réessayez demain.`,
    );
  }

  const jeton = randomBytes(32).toString("base64url");
  const id = crypto.randomUUID();
  try {
    await db.insert(demandesTemoignage).values({
      id,
      transmetteurId: fiche.id,
      stageId: stage?.id ?? null,
      nom,
      email,
      jeton: empreinte(jeton),
      expireLe: new Date(Date.now() + VALIDITE_JOURS * 86_400_000),
    });
  } catch {
    // Deux envois simultanés : l'index unique a refusé le second.
    throw new ErreurDemande(
      "Une demande a déjà été envoyée à cette adresse. Une seule demande par personne.",
    );
  }

  const transmetteur = fiche.nomLieu || fiche.nom;
  try {
    await sendMail({
      to: email,
      // Une réponse au mail arrive au transmetteur, pas au site.
      replyTo: fiche.email,
      subject: `${transmetteur} aimerait votre avis sur votre stage`,
      html: demandeTemoignageHtml(
        nom,
        transmetteur,
        stage?.titre ?? null,
        lien(jeton),
      ),
      text: demandeTemoignageText(
        nom,
        transmetteur,
        stage?.titre ?? null,
        lien(jeton),
      ),
    });
  } catch {
    // Le mail n'est pas parti : la demande n'existe pas, on pourra réessayer.
    await db.delete(demandesTemoignage).where(eq(demandesTemoignage.id, id));
    throw new ErreurDemande(
      "L'email n'a pas pu partir. Rien n'a été enregistré : vous pouvez réessayer.",
    );
  }
}

/**
 * L'envoi depuis le formulaire « Demander un témoignage », le même dans
 * l'espace transmetteur et dans l'admin : c'est à l'appelant de vérifier
 * qu'il a le droit d'écrire au nom de cette fiche.
 */
export async function demanderDepuisFormulaire(
  fiche: Pick<Transmetteur, "id" | "nom" | "nomLieu" | "email">,
  formData: FormData,
): Promise<EtatDemandeTemoignage> {
  const saisie = {
    nom: String(formData.get("nom") ?? ""),
    email: String(formData.get("email") ?? ""),
    stageId: String(formData.get("stageId") ?? ""),
  };
  try {
    await envoyerDemande(fiche, { ...saisie, stageId: saisie.stageId || null });
  } catch (e) {
    if (e instanceof ErreurDemande) {
      return { ok: false, erreur: e.message, valeurs: saisie };
    }
    throw e;
  }
  return {
    ok: true,
    message: `Demande envoyée à ${saisie.nom.trim()}. Son témoignage paraîtra sur la fiche dès qu'il sera écrit.`,
  };
}

/** Les demandes d'une fiche, la plus récente d'abord. */
export async function demandesDeLaFiche(
  transmetteurId: string,
): Promise<DemandeAffichee[]> {
  const demandes = await db.query.demandesTemoignage.findMany({
    where: eq(demandesTemoignage.transmetteurId, transmetteurId),
    orderBy: [desc(demandesTemoignage.envoyeeLe)],
    with: { stage: { columns: { titre: true } } },
  });
  return demandes.map((d) => ({
    id: d.id,
    nom: d.nom,
    email: d.email,
    stage: d.stage?.titre ?? null,
    envoyeeLe: d.envoyeeLe,
    expireLe: d.expireLe,
    reponse: d.reponse,
    retire: d.reponse === "temoignage" && d.temoignageId === null,
  }));
}

/** La demande visée par un lien, si elle attend encore une réponse. */
export async function demandeOuverte(jeton: string) {
  const demande = await db.query.demandesTemoignage.findFirst({
    where: eq(demandesTemoignage.jeton, empreinte(jeton)),
    with: {
      transmetteur: {
        columns: {
          id: true,
          nom: true,
          nomLieu: true,
          slug: true,
          publiee: true,
        },
      },
      stage: { columns: { titre: true } },
    },
  });
  if (!demande) return { etat: "inconnue" as const };
  if (demande.reponse) return { etat: "repondue" as const, demande };
  if (demande.expireLe < new Date())
    return { etat: "expiree" as const, demande };
  return { etat: "ouverte" as const, demande };
}

/** La mention publiée sous le témoignage : « « Immersion au fournil », octobre 2026 ». */
export function contexteDe(demande: {
  envoyeeLe: Date;
  stage: { titre: string } | null;
}) {
  const quand = moisAnnee.format(demande.envoyeeLe);
  return demande.stage ? `« ${demande.stage.titre} », ${quand}` : quand;
}

/** Publie le témoignage et clôt la demande — le lien ne sert qu'une fois. */
export async function deposerTemoignage(
  jeton: string,
  saisie: { texte: string; auteur: string },
) {
  const texte = saisie.texte.trim();
  const auteur = saisie.auteur.trim();
  if (!texte) throw new ErreurDemande("Écrivez quelques mots avant d'envoyer.");
  if (texte.length > LONGUEUR_MAX_TEMOIGNAGE) {
    throw new ErreurDemande(
      `${LONGUEUR_MAX_TEMOIGNAGE} caractères au plus : resserrez un peu.`,
    );
  }
  if (!auteur) throw new ErreurDemande("Indiquez le nom à afficher.");
  if (auteur.length > LONGUEUR_MAX_NOM) {
    throw new ErreurDemande("Ce nom est trop long.");
  }

  const ouverte = await demandeOuverte(jeton);
  if (ouverte.etat !== "ouverte") {
    throw new ErreurDemande("Ce lien n'est plus valable.");
  }
  const { demande } = ouverte;

  const temoignageId = crypto.randomUUID();
  db.transaction((tx) => {
    // Le témoignage d'abord (la demande y renvoie), puis la demande close —
    // seulement si personne ne l'a fait entre-temps. Sinon tout est annulé :
    // deux envois du même formulaire ne publient qu'un témoignage.
    tx.insert(temoignages)
      .values({
        id: temoignageId,
        transmetteurId: demande.transmetteurId,
        texte,
        auteur,
        contexte: contexteDe(demande),
      })
      .run();
    const close = tx
      .update(demandesTemoignage)
      .set({ reponse: "temoignage", reponduLe: new Date(), temoignageId })
      .where(
        and(
          eq(demandesTemoignage.id, demande.id),
          sql`${demandesTemoignage.reponse} is null`,
        ),
      )
      .run();
    if (close.changes !== 1)
      throw new ErreurDemande("Ce lien n'est plus valable.");
  });
  return demande.transmetteur;
}

/** « Je préfère ne pas » : la demande est close, aucune relance possible. */
export async function declinerDemande(jeton: string) {
  const ouverte = await demandeOuverte(jeton);
  if (ouverte.etat !== "ouverte") return;
  await db
    .update(demandesTemoignage)
    .set({ reponse: "refus", reponduLe: new Date() })
    .where(
      and(
        eq(demandesTemoignage.id, ouverte.demande.id),
        sql`${demandesTemoignage.reponse} is null`,
      ),
    );
}
