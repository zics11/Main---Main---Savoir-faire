"use client";

import { useState } from "react";
import Image from "next/image";
import { Lightbox } from "./Lightbox";

const MAX_VISIBLE = 4;

// Vignettes carrées pour les photos propres à un stage — plus discrètes que
// la grande galerie de la fiche (PhotoGallery), mais avec le même soin
// visuel (effet de zoom au survol, badge "+N") et la même visionneuse.
export function StagePhotos({ photos, alt }: { photos: string[]; alt: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  const visibles = photos.slice(0, MAX_VISIBLE);
  const reste = photos.length - visibles.length;

  return (
    <>
      <div className="flex flex-wrap gap-2.5">
        {visibles.map((src, i) => {
          const dernier = i === visibles.length - 1;
          return (
            <button
              key={src}
              type="button"
              onClick={() => setOpenIndex(i)}
              className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-sm border border-border shadow-sm transition-shadow hover:shadow-md"
            >
              <Image
                src={src}
                alt={alt}
                fill
                sizes="96px"
                className="object-cover transition-transform duration-200 ease-out group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-foreground/0 transition-colors group-hover:bg-foreground/10" />
              {dernier && reste > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-foreground/60 text-sm font-semibold text-background">
                  +{reste}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {openIndex !== null && (
        <Lightbox
          photos={photos}
          alt={alt}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}
