import fs from "node:fs";
import path from "node:path";
import type { Response } from "express";
import { config } from "./config.js";
import { queryOne } from "./db.js";
import { isCloudConfigured, getMediaFromCloud } from "./cloud-storage.js";

const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/wav": ".wav",
  "audio/wave": ".wav",
  "audio/x-wav": ".wav",
  "audio/ogg": ".ogg",
  "audio/webm": ".weba",
  "audio/aac": ".aac",
  "audio/m4a": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/mp4": ".m4a",
};

export const ALLOWED_MIME = Object.keys(MIME_EXT);

export function extensionFor(mime: string) {
  return MIME_EXT[mime] ?? "";
}

/** Sends a stored upload. The DB lookup guarantees the file belongs to a known complaint. */
export async function sendMedia(mediaId: string, res: Response) {
  const media = queryOne<{
    filename: string;
    mime: string;
    original_name: string;
  }>("SELECT filename, mime, original_name FROM media WHERE id = ?", [mediaId]);
  if (!media) {
    res.status(404).json({ error: "Media not found" });
    return;
  }
  const safeName = path.basename(media.filename);
  const absolute = path.join(config.uploadDir, safeName);

  let exists = absolute.startsWith(path.resolve(config.uploadDir)) && fs.existsSync(absolute);

  // If missing from local container disk, pull from cloud storage
  if (!exists && isCloudConfigured()) {
    try {
      const cloud = await getMediaFromCloud(mediaId);
      if (cloud) {
        fs.mkdirSync(config.uploadDir, { recursive: true });
        fs.writeFileSync(absolute, cloud.buffer);
        exists = true;
      }
    } catch (e) {
      console.warn("[media] Cloud media retrieval error:", e);
    }
  }

  if (!exists) {
    res.status(404).json({ error: "Media file missing" });
    return;
  }
  res.setHeader("Content-Type", media.mime);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${encodeURIComponent(media.original_name)}"`
  );
  fs.createReadStream(absolute).pipe(res);
}

export function removeMediaFile(filename: string) {
  const absolute = path.join(config.uploadDir, path.basename(filename));
  fs.promises.unlink(absolute).catch(() => undefined);
}
