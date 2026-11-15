import 'server-only';
import {saveImage, looksLikeImage, MAX_IMAGE_BYTES, IMAGE_TYPES} from './files';
import type {Product} from './types';

/** Reads the product form (shared by "add" and "edit"). */
export async function readProductForm(request: Request, id: string) {
  const form = await request.formData();
  const field = (k: string, max = 100) => String(form.get(k) ?? '').trim().slice(0, max);
  const out: Partial<Product> & {error?: string} = {
    name: field('name'),
    category: field('category') || 'Unisex',
    theme: field('theme') || field('category') || 'Unisex',
    price: field('price', 40),
    visible: form.get('visible') !== 'false',
  };
  if (!out.name) return {error: 'Please give the design a name.'};
  const file = form.get('image');
  if (file instanceof File && file.size) {
    if (file.size > MAX_IMAGE_BYTES || !IMAGE_TYPES.includes(file.type)) return {error: 'Use a JPG, PNG or WebP image under 4 MB.'};
    const bytes = await file.arrayBuffer();
    if (!looksLikeImage(new Uint8Array(bytes), file.type)) return {error: 'This file is not a supported image.'};
    out.image = await saveImage('products', id, bytes, file.type);
  }
  return out;
}

