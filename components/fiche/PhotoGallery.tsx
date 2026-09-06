"use client";

import { useState } from "react";
import Image from "next/image";
import { Lightbox } from "./Lightbox";

// Disposition "bento" façon WWOOF : une grande photo à gauche, deux
// vignettes empilées à droite — plutôt que trois photos de même taille
// côte à côte. Un clic ouvre une visionneuse plein écran avec toutes les
// photos (pas seulement les 3 affichées ici).
function celluleClass(i: number, total: number) {
  if (total === 1) return "sm:col-span-2 sm:row-span-2";
  if (i === 0) return "sm:col-start-1 sm:row-span-2";
  if (total === 2) return "sm:col-start-2 sm:row-span-2";
  return i === 1 ? "sm:col-start-2 sm:row-start-1" : "sm:col-start-2 sm:row-start-2";
}

export function PhotoGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  const visibles = photos.slice(0, 3);
  const reste = photos.length - visibles.length;

  return (
    <>
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-3 px-6 sm:h-[420px] sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] sm:grid-rows-2 sm:px-12">
        {visibles.map((src, i) => {
          const dernierVisible = i === visibles.length - 1;
          return (
            <button
              key={src}
              type="button"
              onClick={() => setOpenIndex(i)}
              className={`relative h-64 overflow-hidden rounded-sm border border-border sm:h-auto ${celluleClass(i, visibles.length)}`}
            >
              <Image
                src={src}
                alt={alt}
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
              {dernierVisible && reste > 0 && (
                <span className="absolute right-3 bottom-3 rounded-full bg-card px-4 py-2 text-xs font-semibold shadow-sm">
                  Voir les {photos.length} photos
                </span>
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
