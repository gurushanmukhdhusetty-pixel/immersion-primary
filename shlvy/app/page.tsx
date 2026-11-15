import Storefront from './Storefront';
import {getVisibleProducts} from '@/lib/store';
import {defaultProducts} from '@/lib/default-products';

// Always show the latest products the admin has saved.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const products = await getVisibleProducts();
  return <Storefront catalog={products.length ? products : defaultProducts} />;
}
