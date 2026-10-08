"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { FicheFormState } from "@/app/admin/actions";
import { DOMAINE_LABELS } from "@/lib/constants";
import { PHOTOS_MINIMUM } from "@/lib/fiche-constantes";
import { DOMAINES } from "@/lib/db/schema";
import { BarreEnregistrement } from "@/components/shared/BarreEnregistrement";
import { GaleriePhotosAutonome } from "@/components/shared/GaleriePhotos";
import { useModificationsEnCours } from "@/components/shared/ModificationsEnCours";
import { validatePhotoFile } from "@/lib/photo-validation";
import { LocationPicker } from "./LocationPicker";
import { champ } from "@/lib/style";
import { ImagePlusIcon, Trash2Icon, UserRoundIcon } from "lucide-react";

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
  ville: string | null;
  codePostal: string | null;
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
  ville: "",
  codePostal: "",
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

const inputClass = champ;

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
            <UserRoundIcon aria-hidden className="h-8 w-8 text-primary/40" />
          )}
        </div>
        <div className="flex flex-col items-start gap-1.5">
          {/* Le même geste que la galerie : cadre en pointillés, icône. */}
          <label
            htmlFor="portrait-input"
            className="flex cursor-pointer items-center gap-1.5 rounded-sm border-2 border-dashed border-primary/50 bg-accent/40 px-3.5 py-2 text-sm font-medium text-primary hover:bg-accent"
          >
            <ImagePlusIcon aria-hidden className="h-4 w-4" />
            {showExisting || preview ? "Changer le portrait" : "Ajouter un portrait"}
          </label>
          {(showExisting || preview) && (
            <button
              type="button"
              onClick={clear}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive"
            >
              <Trash2Icon aria-hidden className="h-4 w-4" />
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
      {erreur && <p className="text-sm text-destructive">{erreur}</p>}
    </div>
  );
}

export function FicheForm({
  mode,
  values,
  action,
  espace = "admin",
}: {
  mode: "create" | "edit";
  values?: FicheFormValues;
  action: (
    state: FicheFormState,
    formData: FormData
  ) => Promise<FicheFormState>;
  /** "transmetteur" : sans la case de publication, email en lecture seule. */
  espace?: "admin" | "transmetteur";
}) {
  // Quelque chose a été saisi depuis le dernier enregistrement : la barre du
  // bas le rappelle, l'onglet aussi, et quitter la page demande confirmation.
  const [modifie, setModifie] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [etat, enregistrer, enCours] = useActionState(
    async (precedent: FicheFormState, donnees: FormData) => {
      const resultat = await action(precedent, donnees);
      // Une erreur laisse la marque : la saisie attend toujours.
      if (!resultat || !("erreur" in resultat)) setModifie(false);
      return resultat;
    },
    null
  );
  useModificationsEnCours("fiche", modifie);

  // Écoute native : elle voit aussi les champs que React ne suit pas
  // (photos, point posé sur la carte).
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const noter = () => setModifie(true);
    form.addEventListener("input", noter);
    form.addEventListener("change", noter);
    return () => {
      form.removeEventListener("input", noter);
      form.removeEventListener("change", noter);
    };
  }, []);
  // Après une erreur, on repart de ce qui a été saisi plutôt que des valeurs
  // d'origine : React a vidé le formulaire en terminant l'action.
  const erreur = etat && "erreur" in etat ? etat : null;
  const info = etat && "info" in etat ? etat.info : null;
  const v = erreur
    ? { ...(values ?? EMPTY_VALUES), ...erreur.valeurs }
    : (values ?? EMPTY_VALUES);
  const estTransmetteur = espace === "transmetteur";

  return (
    <form ref={formRef} action={enregistrer} className="flex flex-col gap-6">
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
            <Field label="Email (identifiant de connexion)">
              {/* Affiché seulement : changer l'adresse est un geste à part,
                  confirmé par email (onglet Administration côté association). */}
              <div className={`${inputClass} bg-secondary text-muted-foreground`}>
                {v.email}
              </div>
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
              : " L'adresse se change depuis l'onglet Administration : le transmetteur doit confirmer la nouvelle par email."}
          </p>
        </section>

        <section className="rounded-sm border border-border bg-card p-6">
          <h2 className="mb-4 font-serif text-xl font-semibold">Localisation</h2>
          {/* La commune situe la fiche ; l'adresse exacte, elle, n'est
              jamais demandée. */}
          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <Field label="Ville">
              <input
                name="ville"
                defaultValue={v.ville ?? ""}
                placeholder="ex : Lagrasse"
                className={inputClass}
              />
            </Field>
            <Field label="Code postal">
              <input
                name="codePostal"
                defaultValue={v.codePostal ?? ""}
                inputMode="numeric"
                pattern="[0-9]{5}"
                maxLength={5}
                placeholder="11220"
                className={inputClass}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Complément de lieu (facultatif)">
              <input
                name="lieuApproximatif"
                defaultValue={v.lieuApproximatif ?? ""}
                placeholder="ex : à 10 min de Lézignan"
                className={inputClass}
              />
            </Field>
          </div>
          <p className="mt-3 mb-2 text-xs text-muted-foreground">
            La ville et le code postal sont nécessaires à la mise en ligne. Ils
            s&apos;affichent publiquement sous la forme « Lagrasse (11220) ».
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
          <h2 className="mb-1 font-serif text-xl font-semibold">Photos</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            {PHOTOS_MINIMUM} photos minimum pour pouvoir demander la
            publication de la fiche. La photo d&apos;accueil ouvre la fiche, et
            la représente sur la carte : choisissez-la d&apos;un clic sur
            l&apos;étoile.
          </p>
          {/* Remontée quand les photos enregistrées changent : la galerie
              repart alors de ce qui est en ligne. */}
          <GaleriePhotosAutonome key={v.photos.join("|")} chemins={v.photos} />
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

      {/* La barre du bas, la même dans chaque onglet (case « Fiche visible »
          et « Publier » compris) : ici, elle enregistre la fiche. */}
      <BarreEnregistrement
        modifie={modifie}
        enCours={enCours}
        erreur={erreur?.erreur}
        info={info}
        enregistrer={{
          libelle: mode === "create" ? "Créer la fiche" : "Enregistrer",
        }}
      />
    </form>
  );
}
