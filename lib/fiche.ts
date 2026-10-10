import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { DOMAINES, transmetteurs, users, type Domaine } from "@/lib/db/schema";
import {
  ficheEnLigneHtml,
  ficheEnLigneText,
  inviteEmailHtml,
  inviteEmailText,
} from "@/lib/email";
import { sendMail } from "@/lib/mailer";
import {
  CONTRIBUTION_TRANSMETTEUR,
  enEuros,
  MONTANTS_TRANSMETTEUR,
} from "@/lib/dons";
import { encartEmail } from "@/lib/dons-serveur";
import { creerJetonActivation, lienActivation } from "@/lib/activation";
import { PHOTOS_MINIMUM } from "@/lib/fiche-constantes";
import { codePostalValide } from "@/lib/lieu";
import { ordonnerPhotos } from "@/lib/ordre-photos";
import { slugify } from "@/lib/slug";
import { deleteUploadedPhoto, saveUploadedPhoto } from "@/lib/upload";

// Logique d'enregistrement d'une fiche, partagée entre l'admin et l'espace
// transmetteur. Elle vit hors des fichiers "use server" : toute fonction
// exportée de ceux-ci devient une action appelable depuis le navigateur.
// Aucun contrôle d'accès ici — c'est à chaque action de le faire avant.

/**
 * Erreur de saisie, destinée à être réaffichée dans le formulaire. Les autres
 * erreurs (base de données, etc.) restent des erreurs serveur : on ne renvoie
 * pas leur message à l'écran.
 */
export class ErreurFiche extends Error {}

export async function uniqueSlug(base: string, ignoreId?: string) {
  const slugBase = slugify(base) || "transmetteur";
  let slug = slugBase;
  let i = 2;
  while (
    await db.query.transmetteurs.findFirst({
      where: ignoreId
        ? and(eq(transmetteurs.slug, slug), ne(transmetteurs.id, ignoreId))
        : eq(transmetteurs.slug, slug),
    })
  ) {
    slug = `${slugBase}-${i++}`;
  }
  return slug;
}

export function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function optionalStr(formData: FormData, key: string) {
  const v = str(formData, key);
  return v === "" ? null : v;
}

/**
 * Champs qu'un transmetteur peut modifier lui-même. La publication
 * (`publiee`) et l'email (identité du compte) n'en font volontairement pas
 * partie : ils restent aux mains de l'admin.
 *
 * Seul le nom est exigé : une fiche naît avec le minimum saisi par l'admin,
 * et se complète ensuite. C'est la publication qui réclame le reste.
 */
export function parseFicheFields(formData: FormData) {
  const domaine = str(formData, "domaine");
  if (!DOMAINES.includes(domaine as Domaine)) {
    throw new ErreurFiche("Domaine invalide.");
  }

  const nom = str(formData, "nom");
  if (!nom) throw new ErreurFiche("Le nom est obligatoire.");

  return {
    nom,
    nomLieu: optionalStr(formData, "nomLieu"),
    metier: optionalStr(formData, "metier"),
    histoire: str(formData, "histoire"),
    domaine: domaine as Domaine,
    savoirFaire: optionalStr(formData, "savoirFaire"),
    siteWeb: optionalStr(formData, "siteWeb"),
    reseauxSociaux: optionalStr(formData, "reseauxSociaux"),
    lat: coordonnee(formData, "lat"),
    lng: coordonnee(formData, "lng"),
    ville: optionalStr(formData, "ville"),
    codePostal: codePostal(formData),
    lieuApproximatif: optionalStr(formData, "lieuApproximatif"),
    modalitesAccueil: optionalStr(formData, "modalitesAccueil"),
    hebergement: formData.get("hebergement") === "on",
    repas: formData.get("repas") === "on",
    typeRepas: optionalStr(formData, "typeRepas"),
  };
}

/**
 * Champs tels qu'ils ont été saisis, sans validation : React vide le
 * formulaire dès que l'action est terminée, donc en cas d'erreur on les
 * renvoie pour les réafficher. Les photos choisies, elles, sont perdues.
 */
export function champsSaisis(formData: FormData) {
  const nombre = (cle: string) => {
    const brut = str(formData, cle);
    return brut === "" || !Number.isFinite(Number(brut)) ? null : Number(brut);
  };
  return {
    nom: str(formData, "nom"),
    nomLieu: optionalStr(formData, "nomLieu"),
    metier: optionalStr(formData, "metier"),
    histoire: str(formData, "histoire"),
    domaine: (DOMAINES.includes(str(formData, "domaine") as Domaine)
      ? str(formData, "domaine")
      : DOMAINES[0]) as Domaine,
    savoirFaire: str(formData, "savoirFaire"),
    siteWeb: optionalStr(formData, "siteWeb"),
    reseauxSociaux: optionalStr(formData, "reseauxSociaux"),
    email: str(formData, "email"),
    lat: nombre("lat"),
    lng: nombre("lng"),
    ville: optionalStr(formData, "ville"),
    codePostal: optionalStr(formData, "codePostal"),
    lieuApproximatif: str(formData, "lieuApproximatif"),
    modalitesAccueil: optionalStr(formData, "modalitesAccueil"),
    hebergement: formData.get("hebergement") === "on",
    repas: formData.get("repas") === "on",
    typeRepas: optionalStr(formData, "typeRepas"),
    publiee: formData.get("publiee") === "on",
  };
}

/**
 * Coordonnée du point sur la carte, ou null si aucun point n'est placé.
 * Le champ vide est testé avant la conversion : Number("") vaut 0, ce qui
 * passerait pour une coordonnée valide et placerait la fiche au large de
 * l'Afrique.
 */
function codePostal(formData: FormData) {
  const brut = str(formData, "codePostal");
  if (brut === "") return null;
  if (!codePostalValide(brut)) {
    throw new ErreurFiche("Le code postal doit avoir cinq chiffres.");
  }
  return brut;
}

function coordonnee(formData: FormData, cle: string) {
  const brut = str(formData, cle);
  if (brut === "") return null;
  const valeur = Number(brut);
  if (!Number.isFinite(valeur)) throw new ErreurFiche("Coordonnées invalides.");
  return valeur;
}

/**
 * Ce qui manque pour que la fiche puisse être publiée. Vide = publiable.
 * Ces champs sont facultatifs en base (une fiche naît presque vide) mais
 * indispensables en ligne : sans eux, la fiche n'a ni point sur la carte ni
 * savoir-faire à annoncer.
 */
export function champsManquants(fiche: {
  savoirFaire: string | null;
  ville: string | null;
  codePostal: string | null;
  lat: number | null;
  lng: number | null;
}) {
  const manquants: string[] = [];
  if (!fiche.savoirFaire) manquants.push("le savoir-faire transmis");
  if (!fiche.ville) manquants.push("la ville");
  if (!fiche.codePostal) manquants.push("le code postal");
  if (fiche.lat === null || fiche.lng === null) {
    manquants.push("le point sur la carte");
  }
  return manquants;
}


/**
 * Ce qui manque pour qu'un transmetteur puisse demander la publication :
 * tout ce qui n'est pas marqué optionnel, plus une galerie de photos.
 *
 * Plus exigeant que `champsManquants`, qui conditionne la mise en ligne par
 * l'association : celle-ci garde la main sur les fiches d'archive, arrivées
 * avant ces règles et souvent sans photos.
 */
export function champsManquantsDemande(fiche: {
  savoirFaire: string | null;
  ville: string | null;
  codePostal: string | null;
  lat: number | null;
  lng: number | null;
  histoire: string;
  modalitesAccueil: string | null;
  photoPortrait: string | null;
  photos: string[];
}) {
  const manquants = champsManquants(fiche);
  if (!fiche.histoire.trim()) manquants.push("votre présentation");
  if (!fiche.modalitesAccueil?.trim()) manquants.push("les modalités d'accueil");
  if (!fiche.photoPortrait) manquants.push("votre photo de portrait");
  if (fiche.photos.length < PHOTOS_MINIMUM) {
    const reste = PHOTOS_MINIMUM - fiche.photos.length;
    manquants.push(
      `${reste} photo${reste > 1 ? "s" : ""} de plus (${PHOTOS_MINIMUM} minimum)`
    );
  }
  return manquants;
}

export function parseEmail(formData: FormData) {
  const email = str(formData, "email").toLowerCase();
  if (!email.includes("@")) throw new ErreurFiche("Email invalide.");
  return email;
}

export async function applyPhotos(
  transmetteurId: string,
  existingPhotos: string[],
  formData: FormData
) {
  const keep = new Set(formData.getAll("keepPhotos").map(String));
  const kept = existingPhotos.filter((p) => keep.has(p));
  const removed = existingPhotos.filter((p) => !keep.has(p));

  const newFiles = formData.getAll("photos").filter(
    (f): f is File => f instanceof File && f.size > 0
  );

  const added: string[] = [];
  for (const file of newFiles) {
    added.push(await saveUploadedPhoto(file));
  }

  await Promise.all(removed.map((p) => deleteUploadedPhoto(p)));

  await db
    .update(transmetteurs)
    // Dans l'ordre choisi : la première est la photo d'accueil de la fiche.
    .set({ photos: ordonnerPhotos(formData, kept, added) })
    .where(eq(transmetteurs.id, transmetteurId));
}

// Portrait du transmetteur : une seule photo, distincte de la galerie
// ci-dessus. Un fichier envoyé remplace l'existant ; sinon "removePortrait"
// permet de le retirer sans le remplacer.
export async function applyPortrait(
  transmetteurId: string,
  existingPortrait: string | null,
  formData: FormData
) {
  const file = formData.get("portrait");
  const remove = formData.get("removePortrait") === "on";

  if (file instanceof File && file.size > 0) {
    const saved = await saveUploadedPhoto(file);
    if (existingPortrait) await deleteUploadedPhoto(existingPortrait);
    await db
      .update(transmetteurs)
      .set({ photoPortrait: saved })
      .where(eq(transmetteurs.id, transmetteurId));
  } else if (remove && existingPortrait) {
    await deleteUploadedPhoto(existingPortrait);
    await db
      .update(transmetteurs)
      .set({ photoPortrait: null })
      .where(eq(transmetteurs.id, transmetteurId));
  }
}

/**
 * Prévient le transmetteur que sa fiche vient d'être mise en ligne. L'échec
 * d'envoi n'annule rien : la fiche est publiée, c'est l'essentiel.
 */
export async function prevenirMiseEnLigne(fiche: {
  nom: string;
  slug: string;
  email: string;
}) {
  const url = new URL(
    `/fiche/${fiche.slug}`,
    process.env.AUTH_URL ?? "http://localhost:3000"
  ).toString();
  // L'encart de l'espace transmetteur : sa contribution, par an.
  const soutien = encartEmail("email-transmetteur", {
    titre: "Main à Main vit de dons",
    texte: `Votre fiche est en ligne, sans aucune commission sur vos stages : le site ne vit que de dons. S'il vous amène des stagiaires, une contribution — conseillée ${enEuros(CONTRIBUTION_TRANSMETTEUR)} par an — l'aide à durer.`,
    montants: MONTANTS_TRANSMETTEUR,
    conseille: CONTRIBUTION_TRANSMETTEUR,
    suffixe: " / an",
  });
  try {
    await sendMail({
      to: fiche.email,
      subject: "Votre fiche est en ligne — Main à Main",
      html: ficheEnLigneHtml(fiche.nom, url, soutien),
      text: ficheEnLigneText(fiche.nom, url, soutien),
    });
  } catch (err) {
    console.error(`Publication email to ${fiche.email} failed to send:`, err);
  }
}

/**
 * Crée (ou réutilise) le compte lié à l'email de la fiche, le rattache à la
 * fiche, puis envoie l'email d'accueil : un lien où le transmetteur choisit
 * lui-même son mot de passe, avant d'arriver sur son espace.
 *
 * Renvoie `false` si l'email n'a pas pu partir — la fiche et le compte
 * existent alors quand même, et l'admin peut relancer l'invitation.
 */
export async function inviteTransmetteur(
  transmetteurId: string,
  email: string,
  ficheNom: string
) {
  let user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) {
    [user] = await db
      .insert(users)
      .values({ email, role: "transmetteur" })
      .returning();
  }

  await db
    .update(transmetteurs)
    .set({ userId: user.id })
    .where(eq(transmetteurs.id, transmetteurId));

  const url = lienActivation(await creerJetonActivation(user.id));
  try {
    await sendMail({
      to: email,
      subject: "Votre espace Main à Main est prêt",
      html: inviteEmailHtml(ficheNom, url),
      text: inviteEmailText(ficheNom, url),
    });
  } catch (err) {
    // La fiche et le compte existent déjà : un relais SMTP en panne ne doit
    // pas bloquer leur création. L'admin pourra relancer l'invitation.
    console.error(`Invitation email to ${email} failed to send:`, err);
    return false;
  }

  await db
    .update(transmetteurs)
    .set({ invitationEnvoyeeLe: new Date() })
    .where(eq(transmetteurs.id, transmetteurId));
  return true;
}
