// Partagé entre le client (validation immédiate à la sélection d'un
// fichier, avant tout envoi) et lib/upload.ts (rempart côté serveur) — pour
// ne jamais avoir deux seuils différents.
export const MAX_PHOTO_SIZE_MB = 10;
export const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;

export const ALLOWED_PHOTO_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

/** Retourne un message d'erreur si le fichier est invalide, sinon null. */
export function validatePhotoFile(file: File): string | null {
  if (!ALLOWED_PHOTO_MIME.has(file.type)) {
    return `« ${file.name} » n'est pas une image JPEG, PNG, WebP ou AVIF.`;
  }
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return `« ${file.name} » dépasse ${MAX_PHOTO_SIZE_MB} Mo et n'a pas été ajoutée.`;
  }
  return null;
}
