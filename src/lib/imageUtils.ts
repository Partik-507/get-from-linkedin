/**
 * imageUtils — Canvas-based image compression, format conversion, and uploads.
 * Zero dependencies.
 */

import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

export type ImageFormat = "auto" | "jpg" | "png" | "webp";

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: ImageFormat;
}

const MIME: Record<Exclude<ImageFormat, "auto">, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function pickMime(file: File, format: ImageFormat): string {
  if (format === "auto") {
    if (file.type === "image/png") return "image/png";
    if (file.type === "image/webp") return "image/webp";
    return "image/jpeg";
  }
  return MIME[format];
}

export async function compressImage(
  file: File,
  opts: CompressOptions = {},
): Promise<Blob> {
  const { maxWidth = 2000, maxHeight = 2000, quality = 0.85, format = "auto" } = opts;
  const mime = pickMime(file, format);

  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unsupported");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      mime,
      mime === "image/png" ? undefined : quality,
    );
  });
}

export async function convertFormat(
  blob: Blob,
  format: Exclude<ImageFormat, "auto">,
  quality = 0.9,
): Promise<Blob> {
  const file = new File([blob], "img", { type: blob.type });
  return compressImage(file, { format, quality, maxWidth: 4096, maxHeight: 4096 });
}

export async function uploadToFirebase(blob: Blob, path: string): Promise<string> {
  const r = storageRef(storage, path);
  await uploadBytes(r, blob, { contentType: blob.type });
  return getDownloadURL(r);
}

export async function uploadToLocalFS(
  blob: Blob,
  dirHandle: FileSystemDirectoryHandle,
  name: string,
): Promise<string> {
  // @ts-ignore — File System Access API
  const fileHandle = await dirHandle.getFileHandle(name, { create: true });
  // @ts-ignore
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
  return URL.createObjectURL(blob);
}

export function fileToDataURL(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
