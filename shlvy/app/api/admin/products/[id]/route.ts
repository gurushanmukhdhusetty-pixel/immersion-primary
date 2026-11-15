import {guard} from '@/lib/auth';
import {getProducts, saveProducts} from '@/lib/store';
import {deleteImage} from '@/lib/files';
import {readProductForm} from '@/lib/product-form';
import type {Product} from '@/lib/types';

type Ctx = {params: Promise<{id: string}>};

export async function PATCH(request: Request, {params}: Ctx) {
  const denied = await guard();
  if (denied) return denied;
  try {
    const id = (await params).id;
    const list = await getProducts();
    const i = list.findIndex(p => p.id === id);
    if (i < 0) return Response.json({error: 'Product not found.'}, {status: 404});
    const data = await readProductForm(request, id);
    if (data.error) return Response.json({error: data.error}, {status: 400});
    if (list.some(p => p.id !== id && p.name.toLowerCase() === data.name!.toLowerCase())) return Response.json({error: 'Another design already uses this name.'}, {status: 400});
    const old = list[i];
    if (data.image && data.image !== old.image) await deleteImage(old.image);
    const changes = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as Partial<Product>;
    const next: Product = {...old, ...changes, image: data.image || old.image};
    const kept = new Set([...(next.colors ?? []).map(c => c.image), ...(next.images ?? [])]);
    for (const img of [...(old.colors ?? []).map(c => c.image), ...(old.images ?? [])]) if (img && !kept.has(img)) await deleteImage(img);
    list[i] = next;
    await saveProducts(list);
    return Response.json(list[i]);
  } catch (e) {
    console.error(e);
    return Response.json({error: e instanceof Error ? e.message : 'Could not save.'}, {status: 500});
  }
}

export async function DELETE(_req: Request, {params}: Ctx) {
  const denied = await guard();
  if (denied) return denied;
  try {
    const id = (await params).id;
    const list = await getProducts();
    const p = list.find(x => x.id === id);
    await saveProducts(list.filter(x => x.id !== id));
    if (p) {
      await deleteImage(p.image);
      for (const c of p.colors ?? []) await deleteImage(c.image);
      for (const img of p.images ?? []) await deleteImage(img);
    }
    return Response.json({ok: true});
  } catch (e) {
    return Response.json({error: e instanceof Error ? e.message : 'Could not delete.'}, {status: 500});
  }
}
