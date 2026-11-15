/**
 * Where Shlvy keeps its data.
 *
 *  - On Vercel: an "Upstash for Redis" database (added from the Vercel dashboard → Storage).
 *  - On your own computer (npm run dev) with no database connected: plain JSON files in the .data folder.
 */
import 'server-only';
import {Redis} from '@upstash/redis';
import {promises as fs} from 'fs';
import path from 'path';
import type {Order, Product} from './types';
import {defaultProducts} from './default-products';

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({url, token}) : null;

export const storageConnected = () => !!redis;

export class StorageNotConnected extends Error {
  constructor() {
    super('No database is connected. In Vercel open your project → Storage → connect "Upstash for Redis", then redeploy.');
  }
}

// ---------- local file fallback (development only) ----------
const DATA_DIR = path.join(process.cwd(), '.data');
async function readLocal<T>(name: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, name), 'utf8')) as T;
  } catch {
    return fallback;
  }
}
async function writeLocal(name: string, value: unknown) {
  if (process.env.VERCEL) throw new StorageNotConnected();
  await fs.mkdir(DATA_DIR, {recursive: true});
  await fs.writeFile(path.join(DATA_DIR, name), JSON.stringify(value, null, 2));
}

// ---------- products ----------
const PRODUCTS_KEY = 'shlvy:products';

export async function getProducts(): Promise<Product[]> {
  let list: Product[] | null = null;
  try {
    list = redis ? await redis.get<Product[]>(PRODUCTS_KEY) : await readLocal<Product[] | null>('products.json', null);
  } catch (e) {
    console.error('Could not load products, showing the default collection', e);
  }
  return [...(list ?? defaultProducts)].sort((a, b) => a.order - b.order);
}

export async function getVisibleProducts() {
  return (await getProducts()).filter(p => p.visible);
}

export async function saveProducts(list: Product[]) {
  const ordered = list.map((p, i) => ({...p, order: i}));
  if (redis) await redis.set(PRODUCTS_KEY, ordered);
  else await writeLocal('products.json', ordered);
}

// ---------- orders ----------
const ORDER_INDEX = 'shlvy:orders';
const orderKey = (id: string) => `shlvy:order:${id}`;

export async function listOrders(): Promise<Order[]> {
  if (!redis) {
    const all = await readLocal<Order[]>('orders.json', []);
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const ids = await redis.zrange<string[]>(ORDER_INDEX, 0, -1, {rev: true});
  if (!ids.length) return [];
  const orders: Order[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = await redis.mget<(Order | null)[]>(...ids.slice(i, i + 100).map(orderKey));
    orders.push(...chunk.filter((o): o is Order => !!o));
  }
  return orders;
}

export async function getOrder(id: string): Promise<Order | null> {
  if (!redis) return (await readLocal<Order[]>('orders.json', [])).find(o => o.id === id) ?? null;
  return redis.get<Order>(orderKey(id));
}

export async function saveOrder(order: Order) {
  if (!redis) {
    const all = await readLocal<Order[]>('orders.json', []);
    const i = all.findIndex(o => o.id === order.id);
    if (i >= 0) all[i] = order;
    else all.push(order);
    return writeLocal('orders.json', all);
  }
  await redis.set(orderKey(order.id), order);
  await redis.zadd(ORDER_INDEX, {score: Date.parse(order.createdAt), member: order.id});
}

export async function deleteOrder(id: string) {
  if (!redis) {
    const all = await readLocal<Order[]>('orders.json', []);
    return writeLocal('orders.json', all.filter(o => o.id !== id));
  }
  await redis.del(orderKey(id));
  await redis.zrem(ORDER_INDEX, id);
}
