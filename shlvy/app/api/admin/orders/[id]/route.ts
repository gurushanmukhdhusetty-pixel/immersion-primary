import {guard} from '@/lib/auth';
import {getOrder, saveOrder, deleteOrder} from '@/lib/store';
import {deleteImage} from '@/lib/files';
import {ORDER_STATUSES, type Order} from '@/lib/types';

type Ctx = {params: Promise<{id: string}>};

export async function PATCH(request: Request, {params}: Ctx) {
  const denied = await guard();
  if (denied) return denied;
  const order = await getOrder((await params).id);
  if (!order) return Response.json({error: 'Order not found.'}, {status: 404});
  const body = (await request.json()) as Partial<Order>;
  const now = new Date().toISOString();
  const history = [...(order.history ?? [])];
  if (body.status && body.status !== order.status) {
    if (!ORDER_STATUSES.includes(body.status)) return Response.json({error: 'Unknown status.'}, {status: 400});
    history.push({at: now, text: `Status changed: ${order.status} → ${body.status}`});
    order.status = body.status;
  }
  for (const k of ['price', 'tracking', 'adminNotes'] as const) {
    if (typeof body[k] === 'string' && body[k] !== order[k]) {
      if (k !== 'adminNotes') history.push({at: now, text: `${k === 'price' ? 'Price' : 'Tracking'} set to "${body[k]}"`});
      order[k] = (body[k] as string).slice(0, 4000);
    }
  }
  order.history = history.slice(-100);
  order.updatedAt = now;
  await saveOrder(order);
  return Response.json(order);
}

export async function DELETE(_req: Request, {params}: Ctx) {
  const denied = await guard();
  if (denied) return denied;
  const id = (await params).id;
  const order = await getOrder(id);
  if (order) await deleteImage(order.referenceUrl);
  await deleteOrder(id);
  return Response.json({ok: true});
}
