import {guard} from '@/lib/auth';
import {listOrders} from '@/lib/store';

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return Response.json(await listOrders());
}
