import "server-only";
import { randomUUID } from "crypto";
import { mkdir, rm } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { validatePhotoFile } from "./photo-validation";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? "./uploads";
const MAX_WIDTH = 1600;

export class UploadError extends Error {}

/**
 * Validates, resizes (max 1600px wide) and converts an uploaded image to
 * WebP, then stores it under UPLOADS_DIR. Returns the path to serve it from
 * (via app/uploads/[...path]/route.ts), e.g. "/uploads/<uuid>.webp".
 *
 * The UI validates size/type up front (see lib/photo-validation.ts) so a
 * normal upload never hits this — this check is the last-resort backstop.
 */
export async function saveUploadedPhoto(file: File): Promise<string> {
  const error = validatePhotoFile(file);
  if (error) throw new UploadError(error);

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${randomUUID()}.webp`;

  await mkdir(/*turbopackIgnore: true*/ UPLOADS_DIR, { recursive: true });
  try {
    // sharp decodes the actual image data, which also catches files whose
    // content doesn't match their declared MIME type.
    await sharp(buffer)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(path.join(/*turbopackIgnore: true*/ UPLOADS_DIR, filename));
  } catch {
    throw new UploadError("Ce fichier n'est pas une image valide.");
  }

  return `/uploads/${filename}`;
}

export async function deleteUploadedPhoto(relativePath: string) {
  const filename = path.basename(relativePath);
  await rm(path.join(/*turbopackIgnore: true*/ UPLOADS_DIR, filename), {
    force: true,
  });
}
