import {guard} from '@/lib/auth';
import {getProducts, saveProducts} from '@/lib/store';
import {readProductForm} from '@/lib/product-form';
import type {Product} from '@/lib/types';

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'design';

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return Response.json(await getProducts());
}

export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  try {
    const list = await getProducts();
    const tmpId = crypto.randomUUID().slice(0, 8);
    const data = await readProductForm(request, tmpId);
    if (data.error) return Response.json({error: data.error}, {status: 400});
    if (!data.image) return Response.json({error: 'Please add a product photo.'}, {status: 400});
    if (list.some(p => p.name.toLowerCase() === data.name!.toLowerCase())) return Response.json({error: 'A design with this name already exists.'}, {status: 400});
    const product: Product = {
      id: `${slugify(data.name!)}-${tmpId}`,
      slug: slugify(data.name!),
      name: data.name!,
      category: data.category!,
      theme: data.theme!,
      image: data.image,
      price: data.price!,
      visible: data.visible!,
      order: 0,
      createdAt: new Date().toISOString(),
    };
    await saveProducts([product, ...list]); // new designs appear first
    return Response.json(product, {status: 201});
  } catch (e) {
    console.error(e);
    return Response.json({error: e instanceof Error ? e.message : 'Could not save.'}, {status: 500});
  }
}

/** Save a new order of products (drag / move up & down). Body: ["id1","id2",...] */
export async function PUT(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  try {
    const ids = (await request.json()) as string[];
    const list = await getProducts();
    const byId = new Map(list.map(p => [p.id, p]));
    const ordered = ids.map(id => byId.get(id)).filter((p): p is Product => !!p);
    for (const p of list) if (!ids.includes(p.id)) ordered.push(p);
    await saveProducts(ordered);
    return Response.json(ordered);
  } catch (e) {
    return Response.json({error: e instanceof Error ? e.message : 'Could not save.'}, {status: 500});
  }
}
