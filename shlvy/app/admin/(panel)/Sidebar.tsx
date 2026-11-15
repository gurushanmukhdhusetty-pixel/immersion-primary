'use client';
import {usePathname} from 'next/navigation';

const links = [
  ['/admin', '◎', 'Dashboard'],
  ['/admin/orders', '✉', 'Orders & requests'],
  ['/admin/products', '▦', 'Products'],
  ['/admin/setup', '⚙', 'Setup & help'],
] as const;

export default function Sidebar() {
  const path = usePathname();
  async function logout() {
    await fetch('/api/admin/logout', {method: 'POST'});
    window.location.href = '/admin/login';
  }
  return (
    <aside className="adm-side">
      <div className="adm-brand">shlvy<span>✳︎</span><small>ADMIN</small></div>
      {links.map(([href, icon, label]) => (
        <a key={href} href={href} className={`link ${path === href ? 'on' : ''}`}><span>{icon}</span>{label}</a>
      ))}
      <div className="spacer" />
      <a href="/" target="_blank" className="link"><span>↗</span>View shop</a>
      <button className="link" onClick={logout}>⎋ Sign out</button>
    </aside>
  );
}
