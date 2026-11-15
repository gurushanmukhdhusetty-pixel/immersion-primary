// Uploads one product image (used for colour photos) and returns its address.
import {guard} from '@/lib/auth';
import {saveImage, looksLikeImage, MAX_IMAGE_BYTES, IMAGE_TYPES} from '@/lib/files';

export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  try {
    const file = (await request.formData()).get('image');
    if (!(file instanceof File) || !file.size) return Response.json({error: 'Choose an image.'}, {status: 400});
    if (file.size > MAX_IMAGE_BYTES || !IMAGE_TYPES.includes(file.type)) return Response.json({error: 'Use a JPG, PNG or WebP image under 4 MB.'}, {status: 400});
    const bytes = await file.arrayBuffer();
    if (!looksLikeImage(new Uint8Array(bytes), file.type)) return Response.json({error: 'This file is not a supported image.'}, {status: 400});
    return Response.json({url: await saveImage('products', 'colour-' + crypto.randomUUID().slice(0, 8), bytes, file.type)}, {status: 201});
  } catch (e) {
    console.error(e);
    return Response.json({error: e instanceof Error ? e.message : 'Upload failed.'}, {status: 500});
  }
}
