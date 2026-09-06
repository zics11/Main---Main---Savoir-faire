import { readFile, stat } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

// Resolved from an env var so it can point at a Docker volume in production;
// the ignore pragmas below tell the bundler not to trace the whole project
// just because the path isn't statically known.
const UPLOADS_DIR = path.resolve(
  /*turbopackIgnore: true*/ process.env.UPLOADS_DIR ?? "./uploads"
);

const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".avif": "image/avif",
};

export async function GET(
  _req: Request,
  { params }: RouteContext<"/uploads/[...path]">
) {
  const { path: segments } = await params;

  // Every upload is a flat, single-segment, sharp-generated filename — a
  // multi-segment or dotted-parent request can only be a path-traversal
  // attempt, so reject it outright before touching the filesystem.
  if (segments.length !== 1 || segments[0].includes("..")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filename = segments[0];
  const ext = path.extname(filename).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(/*turbopackIgnore: true*/ UPLOADS_DIR, filename);

  try {
    await stat(/*turbopackIgnore: true*/ filePath);
    const data = await readFile(filePath);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
