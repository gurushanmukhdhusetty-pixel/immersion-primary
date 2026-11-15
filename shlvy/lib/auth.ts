/**
 * Admin login. The username and password come from Vercel → Settings → Environment Variables:
 *   ADMIN_USERNAME  and  ADMIN_PASSWORD
 * Changing ADMIN_PASSWORD (and redeploying) signs everyone out.
 */
import 'server-only';
import {createHmac, timingSafeEqual} from 'crypto';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';

export const COOKIE = 'shlvy_admin';
const DAYS = 7;

export const adminConfigured = () => !!process.env.ADMIN_USERNAME && !!process.env.ADMIN_PASSWORD;
const secret = () => process.env.SESSION_SECRET || `shlvy:${process.env.ADMIN_USERNAME}:${process.env.ADMIN_PASSWORD}`;
const sign = (v: string) => createHmac('sha256', secret()).update(v).digest('hex');

function same(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function checkLogin(username: string, password: string) {
  if (!adminConfigured()) return false;
  return same(username.trim(), process.env.ADMIN_USERNAME!) && same(password, process.env.ADMIN_PASSWORD!);
}

export function makeSession() {
  const expires = String(Date.now() + DAYS * 864e5);
  return {value: `${expires}.${sign(expires)}`, maxAge: DAYS * 86400};
}

export async function isAdmin() {
  if (!adminConfigured()) return false;
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return false;
  const [expires, sig] = v.split('.');
  return !!sig && same(sig, sign(expires)) && Number(expires) > Date.now();
}

/** Use at the top of admin pages. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect('/admin/login');
}

/** Use at the top of admin API routes. Returns a 401 response when not signed in. */
export async function guard() {
  return (await isAdmin()) ? null : Response.json({error: 'Please sign in again.'}, {status: 401});
}
