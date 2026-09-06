"use client";

import { useEffect } from "react";
import Image from "next/image";

// Visionneuse plein écran réutilisée par PhotoGallery (photos de la fiche)
// et StagePhotos (photos d'un stage précis).
export function Lightbox({
  photos,
  alt,
  index,
  onIndexChange,
  onClose,
}: {
  photos: string[];
  alt: string;
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndexChange((index + 1) % photos.length);
      if (e.key === "ArrowLeft") onIndexChange((index - 1 + photos.length) % photos.length);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, photos.length, onClose, onIndexChange]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 p-4 sm:p-10"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-card text-lg"
      >
        ×
      </button>

      {photos.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange((index - 1 + photos.length) % photos.length);
          }}
          aria-label="Photo précédente"
          className="absolute top-1/2 left-3 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-card text-lg sm:left-6"
        >
          ‹
        </button>
      )}

      <div
        className="relative h-full max-h-[80vh] w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Image src={photos[index]} alt={alt} fill sizes="100vw" className="object-contain" />
      </div>

      {photos.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange((index + 1) % photos.length);
          }}
          aria-label="Photo suivante"
          className="absolute top-1/2 right-3 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-card text-lg sm:right-6"
        >
          ›
        </button>
      )}

      {photos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-card px-3 py-1 text-xs font-medium">
          {index + 1} / {photos.length}
        </div>
      )}
    </div>
  );
}
