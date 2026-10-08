"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlusIcon, StarIcon, Trash2Icon } from "lucide-react";
import { validatePhotoFile } from "@/lib/photo-validation";

/**
 * Une photo de la galerie : déjà en ligne (son chemin), ou choisie à
 * l'instant et pas encore envoyée (le fichier et son aperçu local).
 */
export type PhotoGalerie =
  | { cle: string; chemin: string }
  | { cle: string; fichier: File; apercu: string };

let compteur = 0;

/** Ce qui identifie une photo pour savoir si la liste a changé. */
export function referencePhoto(p: PhotoGalerie) {
  return "chemin" in p
    ? p.chemin
    : `nouvelle:${p.fichier.name}:${p.fichier.size}`;
}

export const depuisChemins = (chemins: string[]): PhotoGalerie[] =>
  chemins.map((chemin) => ({ cle: chemin, chemin }));

/**
 * Les photos d'une fiche ou d'un stage. La première est la photo d'accueil :
 * c'est elle qui ouvre la fiche ou le stage, et on la choisit d'un clic sur
 * l'étoile — ou on la change pour une nouvelle image. Rien ne part avant
 * l'enregistrement du formulaire.
 *
 * Champs envoyés : « keepPhotos » (photos en ligne à garder), « photos »
 * (fichiers nouveaux) et « ordrePhotos » (l'ordre voulu, en JSON).
 */
export function GaleriePhotos({
  photos,
  onChange,
}: {
  photos: PhotoGalerie[];
  onChange: (photos: PhotoGalerie[]) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const racineRef = useRef<HTMLDivElement>(null);
  const [erreurs, setErreurs] = useState<string[]>([]);
  // Aperçus créés ici : libérés au démontage.
  const apercus = useRef(new Set<string>());
  // Vrai quand on vient de « Changer » la photo d'accueil : la photo choisie
  // prend sa place, l'ancienne reste dans la galerie.
  const enAccueil = useRef(false);

  useEffect(() => {
    const crees = apercus.current;
    return () => crees.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const nouvelles = useMemo(
    () =>
      photos.filter(
        (p): p is Extract<PhotoGalerie, { fichier: File }> => "fichier" in p,
      ),
    [photos],
  );

  // Le champ fichier contient toujours exactement les nouvelles photos, dans
  // l'ordre de la liste : c'est lui qui les envoie. Un formulaire remis à
  // zéro (après un envoi refusé) le vide : on le remplit à nouveau.
  useEffect(() => {
    const champ = inputRef.current;
    if (!champ) return;
    const remplir = () => {
      const dt = new DataTransfer();
      nouvelles.forEach((p) => dt.items.add(p.fichier));
      champ.files = dt.files;
    };
    remplir();
    const form = champ.form;
    const apresRemiseAZero = () => setTimeout(remplir, 0);
    form?.addEventListener("reset", apresRemiseAZero);
    return () => form?.removeEventListener("reset", apresRemiseAZero);
  }, [nouvelles]);

  /** Change la liste et prévient le formulaire qu'il a quelque chose à enregistrer. */
  function modifier(suivantes: PhotoGalerie[]) {
    onChange(suivantes);
    racineRef.current?.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function ajouter(fichiers: File[]) {
    const refusees: string[] = [];
    const ajoutees: PhotoGalerie[] = [];
    for (const fichier of fichiers) {
      const erreur = validatePhotoFile(fichier);
      if (erreur) {
        refusees.push(erreur);
        continue;
      }
      const apercu = URL.createObjectURL(fichier);
      apercus.current.add(apercu);
      ajoutees.push({ cle: `photo-${++compteur}`, fichier, apercu });
    }
    setErreurs(refusees);
    if (ajoutees.length) {
      modifier(
        enAccueil.current
          ? [ajoutees[0], ...photos, ...ajoutees.slice(1)]
          : [...photos, ...ajoutees],
      );
    }
    enAccueil.current = false;
  }

  function changerAccueil() {
    enAccueil.current = true;
    inputRef.current?.click();
  }

  function retirer(cle: string) {
    const photo = photos.find((p) => p.cle === cle);
    if (photo && "apercu" in photo) {
      URL.revokeObjectURL(photo.apercu);
      apercus.current.delete(photo.apercu);
    }
    modifier(photos.filter((p) => p.cle !== cle));
  }

  function mettreEnAccueil(cle: string) {
    const photo = photos.find((p) => p.cle === cle);
    if (photo) modifier([photo, ...photos.filter((p) => p.cle !== cle)]);
  }

  // L'ordre voulu : une photo en ligne par son chemin, une nouvelle par sa
  // place dans le champ fichier.
  const ordre = photos.map((p) =>
    "chemin" in p ? `e:${p.chemin}` : `n:${nouvelles.indexOf(p)}`,
  );

  return (
    <div ref={racineRef}>
      {photos
        .filter(
          (p): p is Extract<PhotoGalerie, { chemin: string }> => "chemin" in p,
        )
        .map((p) => (
          <input key={p.cle} type="hidden" name="keepPhotos" value={p.chemin} />
        ))}
      <input type="hidden" name="ordrePhotos" value={JSON.stringify(ordre)} />
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        name="photos"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        // La sélection rejoint la liste ; le champ est aussitôt réaligné sur
        // toutes les nouvelles photos.
        onChange={(e) => ajouter(Array.from(e.target.files ?? []))}
        className="sr-only"
      />

      {/* Des vignettes de taille fixe, la photo d'accueil en double : la
          galerie reste compacte quelle que soit la largeur de la page. */}
      <div className="grid grid-cols-[repeat(auto-fill,7rem)] gap-2">
        {photos.map((p, i) => {
          const accueil = i === 0;
          return (
            <figure
              key={p.cle}
              className={`relative aspect-square overflow-hidden rounded-sm bg-secondary ${
                accueil
                  ? "col-span-2 row-span-2 border-2 border-primary"
                  : "border border-border"
              }`}
            >
              <Image
                src={"chemin" in p ? p.chemin : p.apercu}
                alt=""
                fill
                // Un aperçu local n'a pas à passer par l'optimiseur d'images.
                unoptimized={"apercu" in p}
                sizes={accueil ? "240px" : "120px"}
                className="object-cover"
              />
              {accueil && (
                <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-sm bg-primary px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-primary-foreground uppercase shadow-sm">
                  <StarIcon aria-hidden className="h-3 w-3 fill-current" />
                  Photo d&apos;accueil
                </span>
              )}
              {"apercu" in p && (
                <span className="absolute top-1.5 right-1.5 rounded-sm bg-card/95 px-1 py-0.5 text-[9px] font-semibold tracking-wide text-foreground uppercase">
                  Nouvelle
                </span>
              )}

              {/* Les actions restent visibles : sur téléphone, pas de survol. */}
              <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-0.5 bg-linear-to-t from-foreground/70 to-transparent p-1 pt-5">
                {accueil ? (
                  <button
                    type="button"
                    onClick={changerAccueil}
                    title="Choisir une autre image comme photo d'accueil"
                    className="mr-auto flex h-7 items-center gap-1 rounded-sm px-1.5 text-xs font-medium text-background hover:bg-background/20"
                  >
                    <ImagePlusIcon aria-hidden className="h-3.5 w-3.5" />
                    Changer
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => mettreEnAccueil(p.cle)}
                    title="En faire la photo d'accueil"
                    aria-label="En faire la photo d'accueil"
                    className="mr-auto flex h-7 w-7 items-center justify-center rounded-sm text-background hover:bg-background/20"
                  >
                    <StarIcon aria-hidden className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => retirer(p.cle)}
                  title="Retirer cette photo"
                  aria-label="Retirer cette photo"
                  className="flex h-7 w-7 items-center justify-center rounded-sm text-background hover:bg-background/20"
                >
                  <Trash2Icon aria-hidden className="h-3.5 w-3.5" />
                </button>
              </figcaption>
            </figure>
          );
        })}

        <label
          htmlFor={inputId}
          onClick={() => (enAccueil.current = false)}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-sm border-2 border-dashed border-primary/50 bg-accent/40 p-2 text-center text-xs font-medium text-primary hover:bg-accent ${
            photos.length === 0 ? "col-span-full py-8 text-sm" : "aspect-square"
          }`}
        >
          <ImagePlusIcon aria-hidden className="h-5 w-5" />
          {photos.length === 0
            ? "Ajouter des photos — la première sera la photo d'accueil"
            : "Ajouter"}
        </label>
      </div>

      {erreurs.length > 0 && (
        <div className="mt-3 flex flex-col gap-1">
          {erreurs.map((e, i) => (
            <p key={i} className="text-sm text-destructive">
              {e}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * La même galerie, qui tient elle-même sa liste : pour un formulaire qui ne
 * suit pas ses champs un à un (la fiche). À remonter (`key`) quand les photos
 * enregistrées changent.
 */
export function GaleriePhotosAutonome({ chemins }: { chemins: string[] }) {
  const [photos, setPhotos] = useState(() => depuisChemins(chemins));
  return <GaleriePhotos photos={photos} onChange={setPhotos} />;
}
