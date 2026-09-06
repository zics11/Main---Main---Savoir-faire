"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { validatePhotoFile } from "@/lib/photo-validation";

// Les fichiers choisis ne sont envoyés au serveur qu'à l'enregistrement du
// formulaire — on les prévisualise donc nous-mêmes ici (miniatures + retrait
// possible avant envoi), sinon rien ne se passe visuellement à la sélection.
// Champs attendus côté serveur : "photos" (fichiers) et "keepPhotos"
// (valeurs des photos existantes à conserver).
export function PhotosField({ existingPhotos }: { existingPhotos: string[] }) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  const [erreurs, setErreurs] = useState<string[]>([]);
  // Toujours à jour (contrairement à une valeur capturée dans les deps d'un
  // effet), pour révoquer les bonnes URLs objets au démontage.
  const previewsRef = useRef(previews);

  useEffect(() => {
    return () => {
      previewsRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, []);

  // React réinitialise le formulaire une fois l'action serveur terminée : les
  // fichiers en attente viennent alors d'être enregistrés et réaffichés par le
  // serveur, on vide donc les prévisualisations pour ne pas les voir en double.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    function onReset() {
      previewsRef.current.forEach((p) => URL.revokeObjectURL(p.url));
      previewsRef.current = [];
      setPreviews([]);
      setErreurs([]);
    }
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  function syncInput(next: { file: File; url: string }[]) {
    const dt = new DataTransfer();
    next.forEach((p) => dt.items.add(p.file));
    if (inputRef.current) inputRef.current.files = dt.files;
    previewsRef.current = next;
    setPreviews(next);
  }

  function addFiles(incoming: File[]) {
    const rejected: string[] = [];
    const accepted: File[] = [];
    for (const file of incoming) {
      const error = validatePhotoFile(file);
      if (error) rejected.push(error);
      else accepted.push(file);
    }
    setErreurs(rejected);

    const added = accepted.map((file) => ({ file, url: URL.createObjectURL(file) }));
    syncInput([...previews, ...added]);
  }

  function removeAt(i: number) {
    URL.revokeObjectURL(previews[i].url);
    syncInput(previews.filter((_, j) => j !== i));
  }

  return (
    <>
      {existingPhotos.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          {existingPhotos.map((photo) => (
            <div key={photo}>
              <div className="relative h-24 overflow-hidden rounded-sm border border-border">
                <Image src={photo} alt="" fill sizes="160px" className="object-cover" />
              </div>
              <label className="mt-1.5 flex items-center gap-1.5 text-xs">
                <input type="checkbox" name="keepPhotos" value={photo} defaultChecked />
                Conserver
              </label>
            </div>
          ))}
        </div>
      )}

      {previews.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 text-xs text-muted-foreground">
            Nouvelles photos (ajoutées à l&apos;enregistrement) :
          </div>
          <div className="grid grid-cols-3 gap-3">
            {previews.map((p, i) => (
              <div key={i} className="relative">
                <div className="relative h-24 overflow-hidden rounded-sm border border-primary">
                  <Image src={p.url} alt="" fill sizes="160px" className="object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-foreground/70 text-xs font-semibold text-background"
                  aria-label="Retirer cette photo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {erreurs.length > 0 && (
        <div className="mb-2 flex flex-col gap-1">
          {erreurs.map((e, i) => (
            <p key={i} className="text-xs text-destructive">
              {e}
            </p>
          ))}
        </div>
      )}

      <label
        htmlFor={inputId}
        className="flex cursor-pointer items-center justify-center gap-2 rounded-sm border border-dashed border-primary bg-accent px-4 py-5 text-sm font-medium text-primary hover:bg-accent/70"
      >
        + Ajouter des photos
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        name="photos"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
        className="sr-only"
      />
    </>
  );
}
