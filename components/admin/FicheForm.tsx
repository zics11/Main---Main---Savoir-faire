"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { FicheFormState } from "@/app/admin/actions";
import { DOMAINE_LABELS } from "@/lib/constants";
import { DOMAINES } from "@/lib/db/schema";
import { PhotosField } from "@/components/shared/PhotosField";
import { validatePhotoFile } from "@/lib/photo-validation";
import { LocationPicker } from "./LocationPicker";

export type FicheFormValues = {
  nom: string;
  nomLieu: string | null;
  metier: string | null;
  histoire: string;
  domaine: (typeof DOMAINES)[number];
  savoirFaire: string | null;
  siteWeb: string | null;
  reseauxSociaux: string | null;
  email: string;
  lat: number | null;
  lng: number | null;
  lieuApproximatif: string | null;
  modalitesAccueil: string | null;
  hebergement: boolean;
  repas: boolean;
  typeRepas: string | null;
  publiee: boolean;
  photos: string[];
  photoPortrait: string | null;
};

const EMPTY_VALUES: FicheFormValues = {
  nom: "",
  nomLieu: "",
  metier: "",
  histoire: "",
  domaine: "habitat",
  savoirFaire: "",
  siteWeb: "",
  reseauxSociaux: "",
  email: "",
  lat: null,
  lng: null,
  lieuApproximatif: "",
  modalitesAccueil: "",
  hebergement: false,
  repas: false,
  typeRepas: "",
  publiee: true,
  photos: [],
  photoPortrait: null,
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-sm border border-input bg-card px-3 py-2.5 text-sm";

// Portrait du transmetteur (une seule photo, distincte de la galerie ci-dessus).
function PortraitField({ existingPortrait }: { existingPortrait: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const [removed, setRemoved] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const previewRef = useRef(preview);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current.url);
    };
  }, []);

  // Après l'enregistrement, React réinitialise le formulaire : le portrait
  // choisi vient d'être sauvegardé et est réaffiché par le serveur, on repart
  // donc d'un état propre plutôt que de garder l'aperçu local.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    function onReset() {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current.url);
      previewRef.current = null;
      setPreview(null);
      setRemoved(false);
      setErreur(null);
    }
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  function pick(file: File) {
    const error = validatePhotoFile(file);
    if (error) {
      setErreur(error);
      return;
    }
    setErreur(null);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current.url);
    const dt = new DataTransfer();
    dt.items.add(file);
    if (inputRef.current) inputRef.current.files = dt.files;
    const next = { file, url: URL.createObjectURL(file) };
    previewRef.current = next;
    setPreview(next);
    setRemoved(false);
  }

  function clear() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current.url);
    previewRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
    setPreview(null);
    setRemoved(existingPortrait !== null);
    setErreur(null);
  }

  const showExisting = existingPortrait !== null && !preview && !removed;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-accent">
          {preview ? (
            <Image src={preview.url} alt="" fill sizes="80px" className="object-cover" />
          ) : showExisting ? (
            <Image src={existingPortrait} alt="" fill sizes="80px" className="object-cover" />
          ) : (
            <span className="text-[11px] text-muted-foreground">Aucune</span>
          )}
        </div>
        <div className="flex flex-col items-start gap-1.5">
          <label
            htmlFor="portrait-input"
            className="cursor-pointer rounded-sm border border-dashed border-primary bg-accent px-3.5 py-2 text-xs font-medium text-primary hover:bg-accent/70"
          >
            {showExisting || preview ? "Changer la photo" : "+ Ajouter une photo"}
          </label>
          {(showExisting || preview) && (
            <button
              type="button"
              onClick={clear}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Retirer
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          id="portrait-input"
          type="file"
          name="portrait"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) pick(file);
          }}
          className="sr-only"
        />
        {removed && <input type="hidden" name="removePortrait" value="on" />}
      </div>
      {erreur && <p className="text-xs text-destructive">{erreur}</p>}
    </div>
  );
}

export function FicheForm({
  mode,
  values,
  action,
  espace = "admin",
  compteLie = false,
  lienPublic,
  manquants = [],
  bloquee = false,
}: {
  mode: "create" | "edit";
  values?: FicheFormValues;
  action: (
    state: FicheFormState,
    formData: FormData
  ) => Promise<FicheFormState>;
  /** "transmetteur" : sans la case de publication, email en lecture seule. */
  espace?: "admin" | "transmetteur";
  /** Un compte est rattaché : changer l'email déplace aussi la connexion. */
  compteLie?: boolean;
  /** Adresse de la fiche publique, affichée dans l'espace transmetteur. */
  lienPublic?: string;
  /** Ce qu'il reste à remplir avant que la fiche puisse être publiée. */
  manquants?: string[];
  /** Fiche suspendue par l'association : la publication est verrouillée. */
  bloquee?: boolean;
}) {
  const [etat, enregistrer, enCours] = useActionState(action, null);
  // Après une erreur, on repart de ce qui a été saisi plutôt que des valeurs
  // d'origine : React a vidé le formulaire en terminant l'action.
  const v = etat?.valeurs
    ? { ...(values ?? EMPTY_VALUES), ...etat.valeurs }
    : (values ?? EMPTY_VALUES);
  const estTransmetteur = espace === "transmetteur";

  return (
    <form action={enregistrer} className="flex flex-col gap-6">
      <div className="flex flex-col gap-6">
        <section className="rounded-sm border border-border bg-card p-6">
          <h2 className="mb-4 font-serif text-xl font-semibold">Identité</h2>
          <div className="mb-4">
            <div className="mb-1.5 text-sm text-muted-foreground">
              Photo du transmetteur (portrait)
            </div>
            <PortraitField existingPortrait={v.photoPortrait} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nom du transmetteur">
              <input name="nom" defaultValue={v.nom} required className={inputClass} />
            </Field>
            <Field label="Métier (optionnel)">
              <input
                name="metier"
                defaultValue={v.metier ?? ""}
                placeholder="ex : paysanne-boulangère"
                className={inputClass}
              />
            </Field>
            <Field label="Nom du lieu (optionnel)">
              <input
                name="nomLieu"
                defaultValue={v.nomLieu ?? ""}
                placeholder="ex : Le fournil de la Combe"
                className={inputClass}
              />
            </Field>
            <Field
              label={
                estTransmetteur
                  ? "Email (identifiant de connexion)"
                  : "Email de contact (compte transmetteur)"
              }
            >
              <input
                type="email"
                name="email"
                defaultValue={v.email}
                required
                disabled={estTransmetteur}
                className={`${inputClass} disabled:bg-secondary disabled:text-muted-foreground`}
              />
            </Field>
            <Field label="Domaine">
              <select name="domaine" defaultValue={v.domaine} className={inputClass}>
                {DOMAINES.map((d) => (
                  <option key={d} value={d}>
                    {DOMAINE_LABELS[d]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Savoir-faire transmis">
              <input
                name="savoirFaire"
                defaultValue={v.savoirFaire ?? ""}
                placeholder="ex : pain au levain au four à bois"
                className={inputClass}
              />
            </Field>
            <Field label="Site web (optionnel)">
              <input name="siteWeb" defaultValue={v.siteWeb ?? ""} className={inputClass} />
            </Field>
            <Field label="Réseaux sociaux (optionnel)">
              <input
                name="reseauxSociaux"
                defaultValue={v.reseauxSociaux ?? ""}
                className={inputClass}
              />
            </Field>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Si &quot;nom du lieu&quot; est renseigné, la fiche publique
            l&apos;affiche en grand titre, avec le nom et le métier en
            sous-titre. Sinon, seul le nom du transmetteur est affiché.
            {estTransmetteur
              ? " Pour changer d'adresse email, contactez l'association."
              : compteLie &&
                " L'email est aussi l'identifiant de connexion du transmetteur : le modifier déplace son compte sur la nouvelle adresse."}
          </p>
        </section>

        <section className="rounded-sm border border-border bg-card p-6">
          <h2 className="mb-4 font-serif text-xl font-semibold">Localisation</h2>
          <Field label="Lieu approximatif affiché publiquement">
            <input
              name="lieuApproximatif"
              defaultValue={v.lieuApproximatif ?? ""}
              placeholder="ex : près de Durban-Corbières"
              className={inputClass}
            />
          </Field>
          <p className="mt-3 mb-2 text-xs text-muted-foreground">
            Cliquez sur la carte pour placer le point (aucune adresse exacte
            n&apos;est demandée, pour protéger la vie privée du
            transmetteur).
          </p>
          <LocationPicker lat={v.lat} lng={v.lng} />
        </section>

        <section className="rounded-sm border border-border bg-card p-6">
          <h2 className="mb-4 font-serif text-xl font-semibold">Présentation</h2>
          <Field label="Histoire / présentation">
            <textarea
              name="histoire"
              defaultValue={v.histoire}
              rows={6}
              className={inputClass}
            />
          </Field>
        </section>

        <section className="rounded-sm border border-border bg-card p-6">
          <h2 className="mb-4 font-serif text-xl font-semibold">Photos</h2>
          <PhotosField existingPhotos={v.photos} />
        </section>

        <section className="rounded-sm border border-border bg-card p-6">
          <h2 className="mb-4 font-serif text-xl font-semibold">
            Infos pratiques
          </h2>
          <label className="mb-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="hebergement"
              defaultChecked={v.hebergement}
            />
            Hébergement sur place
          </label>
          <label className="mb-4 flex items-center gap-2 text-sm">
            <input type="checkbox" name="repas" defaultChecked={v.repas} />
            Repas proposés
          </label>
          <Field label="Détail des repas (optionnel)">
            <input
              name="typeRepas"
              defaultValue={v.typeRepas ?? ""}
              placeholder="ex : Repas partagés, produits de la ferme"
              className={`${inputClass} mb-4`}
            />
          </Field>
          <Field label="Modalités d'accueil">
            <textarea
              name="modalitesAccueil"
              defaultValue={v.modalitesAccueil ?? ""}
              rows={3}
              className={inputClass}
            />
          </Field>
          <p className="mt-3 text-xs text-muted-foreground">
            Le niveau et les formes de transmission (stage payant, chantier
            participatif…) se règlent pour chaque stage, dans l&apos;onglet
            Stages — un même transmetteur peut proposer plusieurs types de
            stages.
          </p>
        </section>
      </div>

      {/* Barre d'enregistrement fixée au bas de l'écran : elle reste sous la
          main où qu'on soit dans la page, pas seulement dans le formulaire. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-3 sm:px-8">
        <div className="text-sm">
          {estTransmetteur ? (
            <>
              <span className="font-medium">
                {v.publiee
                  ? "Votre fiche est en ligne"
                  : "Votre fiche n'est pas encore en ligne"}
              </span>{" "}
              <span className="text-muted-foreground">
                {v.publiee
                  ? "Vos modifications sont visibles dès l'enregistrement."
                  : manquants.length
                    ? `Il reste à renseigner ${manquants.join(", ")}.`
                    : "L'association la publiera."}
              </span>
              {v.publiee && lienPublic && (
                <a
                  href={lienPublic}
                  target="_blank"
                  rel="noopener"
                  className="ml-2 font-medium underline underline-offset-2"
                >
                  Voir ma fiche publique ↗
                </a>
              )}
            </>
          ) : (
            <>
              <label className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  name="publiee"
                  defaultChecked={v.publiee}
                  disabled={bloquee || manquants.length > 0}
                />
                <span>Fiche visible sur le site</span>
              </label>
              {(bloquee || manquants.length > 0) && (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {bloquee
                    ? "Fiche bloquée : levez le blocage pour pouvoir la publier."
                    : `Publication impossible tant qu'il manque ${manquants.join(", ")}.`}
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {etat?.erreur && (
            <p role="alert" className="text-sm text-destructive">
              {etat.erreur}
            </p>
          )}
          <button
            type="submit"
            disabled={enCours}
            className="rounded-sm bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-[#8a4222] disabled:opacity-60"
          >
            {enCours
              ? "Enregistrement…"
              : mode === "create"
                ? "Créer la fiche"
                : "Enregistrer"}
          </button>
        </div>
        </div>
      </div>
    </form>
  );
}
