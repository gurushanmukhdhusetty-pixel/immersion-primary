import {listOrders, getProducts, storageConnected} from '@/lib/store';
import {ORDER_STATUSES} from '@/lib/types';
import {money} from '../ui';

export default async function Dashboard() {
  const [orders, products] = await Promise.all([listOrders(), getProducts()]);
  const count = (s: string) => orders.filter(o => o.status === s).length;
  const earned = orders.filter(o => ['Paid', 'Shipped', 'Delivered'].includes(o.status)).reduce((t, o) => t + money(o.price), 0);
  const open = orders.filter(o => !['Delivered', 'Cancelled'].includes(o.status)).length;
  const week = orders.filter(o => Date.now() - Date.parse(o.createdAt) < 7 * 864e5).length;
  const popular = Object.entries(orders.reduce<Record<string, number>>((m, o) => (o.selectedDesign ? {...m, [o.selectedDesign]: (m[o.selectedDesign] || 0) + 1} : m), {}))
    .sort((a, b) => b[1] - a[1]).slice(0, 5);
  return (
    <>
      <div className="adm-top">
        <div><h1>Welcome back 👋</h1><p>Here’s what’s happening in your Shlvy shop.</p></div>
        <a className="adm-btn orange" href="/admin/orders">Open orders →</a>
      </div>
      {!storageConnected() && (
        <div className="adm-err" style={{marginBottom: 16}}>
          The database isn’t connected yet, so orders can’t be saved on the live site. Go to <a href="/admin/setup"><u>Setup &amp; help</u></a> to fix it in 2 minutes.
        </div>
      )}
      <div className="adm-grid adm-stats" style={{marginBottom: 16}}>
        <div className="adm-card adm-stat"><span>New — need a reply</span><b style={{color: 'var(--accent)'}}>{count('New')}</b></div>
        <div className="adm-card adm-stat"><span>Open orders</span><b>{open}</b></div>
        <div className="adm-card adm-stat"><span>Last 7 days</span><b>{week}</b></div>
        <div className="adm-card adm-stat"><span>Earned (paid+)</span><b>{earned.toLocaleString()}</b></div>
        <div className="adm-card adm-stat"><span>Products live</span><b>{products.filter(p => p.visible).length}<small className="adm-muted" style={{fontSize: 14}}> / {products.length}</small></b></div>
      </div>
      <div className="adm-grid" style={{gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))'}}>
        <div className="adm-card">
          <h2 style={{marginBottom: 12}}>Latest requests</h2>
          {orders.length === 0 && <p className="adm-muted">No orders yet. They’ll appear here as soon as a customer sends one.</p>}
          {orders.slice(0, 6).map(o => (
            <a key={o.id} href={`/admin/orders?open=${o.id}`} className="adm-row" style={{justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--line)'}}>
              <span><b>{o.name}</b> <span className="adm-muted adm-small">· {o.selectedDesign || 'Custom design'}</span></span>
              <span className={`badge ${o.status}`}>{o.status}</span>
            </a>
          ))}
        </div>
        <div className="adm-card">
          <h2 style={{marginBottom: 12}}>Orders by stage</h2>
          {ORDER_STATUSES.map(s => (
            <div key={s} className="adm-row" style={{justifyContent: 'space-between', padding: '6px 0'}}>
              <span className={`badge ${s}`}>{s}</span><b>{count(s)}</b>
            </div>
          ))}
        </div>
        <div className="adm-card">
          <h2 style={{marginBottom: 12}}>Most requested designs</h2>
          {popular.length === 0 && <p className="adm-muted">No purchase requests yet.</p>}
          {popular.map(([name, n]) => (
            <div key={name} className="adm-row" style={{justifyContent: 'space-between', padding: '6px 0'}}><span>{name}</span><b>{n}</b></div>
          ))}
        </div>
      </div>
    </>
  );
}
