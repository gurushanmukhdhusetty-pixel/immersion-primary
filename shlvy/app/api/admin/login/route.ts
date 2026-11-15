import {checkLogin, makeSession, COOKIE, adminConfigured} from '@/lib/auth';
import {cookies} from 'next/headers';

export async function POST(request: Request) {
  if (!adminConfigured())
    return Response.json({error: 'Admin login is not set up yet. Add ADMIN_USERNAME and ADMIN_PASSWORD in Vercel → Settings → Environment Variables, then redeploy.'}, {status: 503});
  const {username, password} = (await request.json().catch(() => ({}))) as {username?: string; password?: string};
  if (!checkLogin(String(username ?? ''), String(password ?? ''))) {
    await new Promise(r => setTimeout(r, 800)); // slow down guessing
    return Response.json({error: 'Wrong username or password.'}, {status: 401});
  }
  const s = makeSession();
  (await cookies()).set(COOKIE, s.value, {httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: s.maxAge});
  return Response.json({ok: true});
}
