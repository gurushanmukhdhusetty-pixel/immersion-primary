// Shows uploaded images. Customer reference images are only visible to a signed-in admin.
import {readImage} from '@/lib/files';
import {isAdmin} from '@/lib/auth';

export async function GET(_req: Request, {params}: {params: Promise<{path: string[]}>}) {
  const pathname = (await params).path.join('/');
  if (pathname.startsWith('references/') && !(await isAdmin())) return new Response('Not found', {status: 404});
  const file = await readImage(pathname);
  if (!file) return new Response('Not found', {status: 404});
  const cache = pathname.startsWith('products/') ? 'public, max-age=31536000, immutable' : 'private, no-store';
  return new Response(file.body as BodyInit, {headers: {'content-type': file.type, 'cache-control': cache}});
}
