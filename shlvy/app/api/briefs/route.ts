// Customers' purchase requests and custom-design briefs from the website land here.
import {getVisibleProducts, saveOrder, StorageNotConnected} from '@/lib/store';
import {saveImage, deleteImage, looksLikeImage, MAX_IMAGE_BYTES, IMAGE_TYPES} from '@/lib/files';
import type {Order} from '@/lib/types';

export async function POST(request: Request) {
  let savedImage: string | null = null;
  try {
    if (Number(request.headers.get('content-length')) > MAX_IMAGE_BYTES + 32000)
      return Response.json({error: 'Choose an image under 4 MB.'}, {status: 413});
    let d: Record<string, unknown>;
    let reference: File | null = null;
    if (request.headers.get('content-type')?.includes('multipart/form-data')) {
      const form = await request.formData();
      const brief = form.get('brief');
      if (typeof brief !== 'string' || brief.length > 16000) return Response.json({error: 'Invalid brief.'}, {status: 400});
      d = JSON.parse(brief);
      const upload = form.get('reference');
      if (upload instanceof File && upload.size) reference = upload;
    } else d = (await request.json()) as Record<string, unknown>;

    const products = await getVisibleProducts();
    const product = products.find(c => c.name === d.selectedDesign);
    if (d.requestType === 'purchase' && !product) return Response.json({error: 'Choose an available example design.'}, {status: 400});
    const colorNames = product?.colors?.map(c => c.name) ?? [];
    if (d.requestType === 'purchase' && colorNames.length && (typeof d.selectedColor !== 'string' || !colorNames.includes(d.selectedColor)))
      return Response.json({error: 'Choose a colour for your case.'}, {status: 400});
    const typeNames = product?.caseTypes?.map(t => t.name) ?? [];
    if (d.requestType === 'purchase' && typeNames.length && (typeof d.selectedCaseType !== 'string' || !typeNames.includes(d.selectedCaseType)))
      return Response.json({error: 'Choose a case type.'}, {status: 400});

    let bytes: ArrayBuffer | undefined;
    if (reference) {
      if (reference.size > MAX_IMAGE_BYTES || !IMAGE_TYPES.includes(reference.type))
        return Response.json({error: 'Choose a JPG, PNG or WebP image under 4 MB.'}, {status: 400});
      bytes = await reference.arrayBuffer();
      if (!looksLikeImage(new Uint8Array(bytes), reference.type)) return Response.json({error: 'This file is not a supported image.'}, {status: 400});
    }

    const str = (v: unknown, max: number, required = true) => typeof v === 'string' && v.length <= max && (!required || !!v.trim());
    if (
      !str(d.name, 100) || !str(d.email, 254) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email as string) ||
      !str(d.model, 120) || !str(d.notes, 2000, false) || !str(d.style, 100) || !str(d.palette, 100) ||
      !Array.isArray(d.interests) || d.interests.length > 40 || d.interests.some(i => typeof i !== 'string' || i.length > 60) ||
      (!d.interests.length && !(d.notes as string).trim())
    )
      return Response.json({error: 'Please check your details and complete all steps.'}, {status: 400});

    const id = crypto.randomUUID();
    if (reference && bytes) savedImage = await saveImage('references', id, bytes, reference.type);
    const now = new Date().toISOString();
    const purchase = d.requestType === 'purchase';
    const order: Order = {
      id,
      requestType: purchase ? 'purchase' : 'custom',
      selectedDesign: purchase ? String(d.selectedDesign) : null,
      selectedColor: purchase && colorNames.length ? String(d.selectedColor) : null,
      selectedCaseType: purchase && typeNames.length ? String(d.selectedCaseType) : null,
      name: (d.name as string).trim(),
      email: (d.email as string).trim(),
      model: (d.model as string).trim(),
      notes: (d.notes as string).trim(),
      style: d.style as string,
      palette: d.palette as string,
      interests: d.interests as string[],
      referenceUrl: savedImage,
      referenceName: reference?.name.slice(0, 200) || null,
      createdAt: now,
      updatedAt: now,
      status: 'New',
      price: '',
      tracking: '',
      adminNotes: '',
      history: [{at: now, text: 'Request received from website'}],
    };
    await saveOrder(order);
    return Response.json({id}, {status: 201});
  } catch (e) {
    console.error(e);
    if (savedImage) await deleteImage(savedImage);
    const msg = e instanceof StorageNotConnected ? 'Our order system is being set up. Please try again soon.' : 'We could not save your brief. Please try again.';
    return Response.json({error: msg}, {status: 500});
  }
}
