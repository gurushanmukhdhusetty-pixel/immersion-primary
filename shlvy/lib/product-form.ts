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
  const safeImg = (v: unknown) => {
    const img = String(v ?? '');
    return /^\/(api\/files\/products|designs)\/[\w./-]+$/.test(img) && !img.includes('..') ? img : null;
  };
  if (form.has('images')) {
    try {
      out.images = (JSON.parse(String(form.get('images'))) as unknown[]).map(safeImg).filter((x): x is string => !!x).slice(0, 12);
    } catch {
      return {error: 'Photos could not be read.'};
    }
  }
  if (form.has('colors')) try {
    const raw = JSON.parse(String(form.get('colors') ?? '[]')) as {name?: unknown; hex?: unknown; image?: unknown}[];
    out.colors = raw
      .map(c => {
        const img = String(c.image ?? '');
        const safe = /^\/(api\/files\/products|designs)\/[\w./-]+$/.test(img) && !img.includes('..');
        return {name: String(c.name ?? '').trim().slice(0, 40), hex: /^#[0-9a-f]{6}$/i.test(String(c.hex)) ? String(c.hex) : '#cccccc', ...(safe ? {image: img} : {})};
      })
      .filter(c => c.name)
      .slice(0, 20);
  } catch {
    return {error: 'Colour options could not be read.'};
  }
  if (out.colors && new Set(out.colors.map(c => c.name.toLowerCase())).size !== out.colors.length) return {error: 'Two colours have the same name.'};
  if (form.has('caseTypes')) try {
    const raw = JSON.parse(String(form.get('caseTypes') ?? '[]')) as {name?: unknown; price?: unknown}[];
    out.caseTypes = raw
      .map(t => ({name: String(t.name ?? '').trim().slice(0, 40), price: String(t.price ?? '').trim().slice(0, 40)}))
      .filter(t => t.name)
      .slice(0, 20);
  } catch {
    return {error: 'Case types could not be read.'};
  }
  if (out.caseTypes && new Set(out.caseTypes.map(t => t.name.toLowerCase())).size !== out.caseTypes.length) return {error: 'Two case types have the same name.'};
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

