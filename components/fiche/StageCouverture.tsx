"use client";

import { useState } from "react";
import Image from "next/image";
import { ImagesIcon } from "lucide-react";
import { EtiquetteForme } from "@/components/shared/Etiquettes";
import { Lightbox } from "./Lightbox";

/**
 * La première photo d'un stage, en grand, en tête de sa carte : c'est elle
 * qui donne envie avant même de lire. Les autres s'ouvrent dans la même
 * visionneuse que la galerie de la fiche.
 */
export function StageCouverture({
  photos,
  alt,
  forme,
}: {
  photos: string[];
  alt: string;
  /** Forme du stage, posée sur la photo (« Stage payant », « Portes ouvertes »…). */
  forme: string | null;
}) {
  const [ouverte, setOuverte] = useState<number | null>(null);

  if (photos.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOuverte(0)}
        aria-label={`Voir les photos de « ${alt} »`}
        className="group relative block aspect-[16/8] w-full overflow-hidden bg-secondary"
      >
        <Image
          src={photos[0]}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 640px, 100vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
        {/* Un léger voile en bas, pour que le compteur de photos reste
            lisible sur une photo claire. */}
        <span className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-foreground/35 to-transparent" />

        {forme && (
          <EtiquetteForme forme={forme} className="absolute top-3 left-3" />
        )}

        {photos.length > 1 && (
          <span className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-sm bg-card/95 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm">
            <ImagesIcon aria-hidden className="h-3.5 w-3.5" />
            {photos.length} photos
          </span>
        )}
      </button>

      {ouverte !== null && (
        <Lightbox
          photos={photos}
          alt={alt}
          index={ouverte}
          onIndexChange={setOuverte}
          onClose={() => setOuverte(null)}
        />
      )}
    </>
  );
}
