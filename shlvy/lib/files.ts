/**
 * Image uploads (product photos + customer reference images).
 *
 *  - On Vercel: a "Blob" store (Vercel dashboard → Storage → Blob).
 *  - Locally with no Blob store: files are saved in .data/uploads.
 * Images are always shown through /api/files/..., so both public and private Blob stores work.
 */
import 'server-only';
import {put, get, del} from '@vercel/blob';
import {promises as fs} from 'fs';
import path from 'path';
import {StorageNotConnected} from './store';

const hasBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const LOCAL_DIR = path.join(process.cwd(), '.data', 'uploads');
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // Vercel accepts up to ~4.5 MB per request
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function looksLikeImage(bytes: Uint8Array, type: string) {
  const b = bytes;
  if (type === 'image/png') return b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71;
  if (type === 'image/jpeg') return b[0] === 255 && b[1] === 216 && b[2] === 255;
  if (type === 'image/webp') return String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP';
  return false;
}

const ext = (type: string) => (type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg');

/** Saves an image and returns the address to show it at. */
export async function saveImage(folder: 'products' | 'references', id: string, bytes: ArrayBuffer, type: string): Promise<string> {
  const name = `${folder}/${id}-${Date.now().toString(36)}.${ext(type)}`;
  if (hasBlob()) {
    const opts = {contentType: type, addRandomSuffix: true} as const;
    let pathname: string;
    try {
      pathname = (await put(name, bytes, {...opts, access: 'private'})).pathname;
    } catch {
      pathname = (await put(name, bytes, {...opts, access: 'public'})).pathname;
    }
    return `/api/files/${pathname}`;
  }
  if (process.env.VERCEL) throw new StorageNotConnected();
  const file = path.join(LOCAL_DIR, name);
  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(file, Buffer.from(bytes));
  return `/api/files/${name}`;
}

/** Reads a stored image for /api/files. */
export async function readImage(pathname: string): Promise<{body: ReadableStream | Buffer; type: string} | null> {
  if (pathname.includes('..')) return null;
  if (hasBlob()) {
    for (const access of ['private', 'public'] as const) {
      try {
        const r = await get(pathname, {access});
        if (r && r.statusCode === 200) return {body: r.stream, type: r.blob.contentType || 'image/jpeg'};
      } catch {}
    }
    return null;
  }
  try {
    const buf = await fs.readFile(path.join(LOCAL_DIR, pathname));
    const t = pathname.endsWith('.png') ? 'image/png' : pathname.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
    return {body: buf, type: t};
  } catch {
    return null;
  }
}

export async function deleteImage(src: string | null | undefined) {
  if (!src?.startsWith('/api/files/')) return;
  const pathname = src.slice('/api/files/'.length);
  try {
    if (hasBlob()) await del(pathname);
    else await fs.unlink(path.join(LOCAL_DIR, pathname));
  } catch {}
}
