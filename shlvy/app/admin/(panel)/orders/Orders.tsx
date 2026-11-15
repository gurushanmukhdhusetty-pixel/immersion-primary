'use client';
import {useEffect, useMemo, useState} from 'react';
import {ORDER_STATUSES, type Order} from '@/lib/types';
import {api, when} from '../../ui';

const NEXT_STEP: Record<string, string> = {New: 'Contacted', Contacted: 'Confirmed', Confirmed: 'Paid', Paid: 'Shipped', Shipped: 'Delivered'};

export default function Orders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Active');
  const [type, setType] = useState('All');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    try {
      setOrders(await api<Order[]>('/api/admin/orders'));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
    const id = new URLSearchParams(window.location.search).get('open');
    if (id) setOpenId(id);
    const t = setInterval(load, 60000); // refresh every minute
    return () => clearInterval(t);
  }, []);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (orders ?? []).filter(o =>
      (status === 'All' || (status === 'Active' ? !['Delivered', 'Cancelled'].includes(o.status) : o.status === status)) &&
      (type === 'All' || (type === 'Buy a design' ? o.requestType === 'purchase' : o.requestType === 'custom')) &&
      (!s || [o.name, o.email, o.model, o.selectedDesign, o.id, o.notes].join(' ').toLowerCase().includes(s)),
    );
  }, [orders, status, type, q]);

  const current = orders?.find(o => o.id === openId) ?? null;
  const replace = (o: Order) => setOrders(list => list?.map(x => (x.id === o.id ? o : x)) ?? null);

  return (
    <>
      <div className="adm-top">
        <div><h1>Orders &amp; requests</h1><p>Every “Buy this design” request and custom brief from the website.</p></div>
        <div className="adm-row">
          <button className="adm-btn ghost" onClick={load}>↻ Refresh</button>
          <a className="adm-btn ghost" href="/api/admin/orders/export">⇩ Download spreadsheet</a>
        </div>
      </div>
      <div className="adm-card" style={{marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12}}>
        <input className="adm-input" placeholder="Search name, email, phone model, design…" value={q} onChange={e => setQ(e.target.value)} />
        <div className="adm-pills">
          {['Active', 'All', ...ORDER_STATUSES].map(s => (
            <button key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>
              {s}{orders && s !== 'All' && s !== 'Active' ? ` (${orders.filter(o => o.status === s).length})` : ''}
            </button>
          ))}
        </div>
        <div className="adm-pills">
          {['All', 'Buy a design', 'Custom design'].map(s => <button key={s} className={type === s ? 'on' : ''} onClick={() => setType(s)}>{s}</button>)}
        </div>
      </div>
      {error && <div className="adm-err">{error}</div>}
      {!orders && !error && <p className="adm-muted">Loading…</p>}
      {orders && shown.length === 0 && <div className="adm-card adm-muted">No orders match. {orders.length === 0 && 'When customers send requests from the website they’ll show up here.'}</div>}
      {shown.length > 0 && (
        <div style={{overflowX: 'auto'}}><table className="adm-table">
          <thead><tr><th>Received</th><th>Customer</th><th>What</th><th className="hide-m">Phone</th><th className="hide-m">Price</th><th>Status</th></tr></thead>
          <tbody>
            {shown.map(o => (
              <tr key={o.id} className="click" onClick={() => setOpenId(o.id)}>
                <td className="adm-small">{when(o.createdAt)}</td>
                <td><b>{o.name}</b><div className="adm-muted adm-small">{o.email}</div></td>
                <td>{o.selectedDesign || 'Custom design'}<div><span className="badge type">{o.requestType === 'purchase' ? 'Buy' : 'Custom'}</span></div></td>
                <td className="hide-m">{o.model}</td>
                <td className="hide-m">{o.price || '—'}</td>
                <td><span className={`badge ${o.status}`}>{o.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
      {current && <OrderDrawer key={current.id} order={current} onClose={() => setOpenId(null)} onSaved={replace} onDeleted={id => { setOrders(l => l?.filter(x => x.id !== id) ?? null); setOpenId(null); }} />}
    </>
  );
}

function OrderDrawer({order, onClose, onSaved, onDeleted}: {order: Order; onClose: () => void; onSaved: (o: Order) => void; onDeleted: (id: string) => void}) {
  const [form, setForm] = useState({status: order.status, price: order.price, tracking: order.tracking, adminNotes: order.adminNotes});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ok?: string; err?: string}>({});
  const ref = order.id.slice(0, 8).toUpperCase();
  const what = order.selectedDesign ? `the ${order.selectedDesign} case` : 'your custom case design';

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);

  async function save(patch = form) {
    setBusy(true);
    setMsg({});
    try {
      const o = await api<Order>(`/api/admin/orders/${order.id}`, {method: 'PATCH', headers: {'content-type': 'application/json'}, body: JSON.stringify(patch)});
      onSaved(o);
      setForm({status: o.status, price: o.price, tracking: o.tracking, adminNotes: o.adminNotes});
      setMsg({ok: 'Saved ✓'});
    } catch (e) {
      setMsg({err: (e as Error).message});
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!confirm(`Delete the request from ${order.name}? This cannot be undone.`)) return;
    try {
      await api(`/api/admin/orders/${order.id}`, {method: 'DELETE'});
      onDeleted(order.id);
    } catch (e) {
      setMsg({err: (e as Error).message});
    }
  }
  const mail = (subject: string, body: string) => `mailto:${order.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const templates = [
    ['Send price quote', `Your Shlvy order ${ref}`, `Hi ${order.name},\n\nThanks for your request for ${what} for your ${order.model}.\n\nGood news — it fits your phone. The price is ${form.price || '[price]'} including delivery.\n\nReply to this email to confirm and we’ll send payment details.\n\nShlvy`],
    ['Payment received', `Payment received — Shlvy order ${ref}`, `Hi ${order.name},\n\nWe’ve received your payment for ${what}. We’re getting it ready now and will email you when it ships.\n\nShlvy`],
    ['Shipped', `Your Shlvy case is on its way — ${ref}`, `Hi ${order.name},\n\nYour case has shipped!${form.tracking ? `\nTracking: ${form.tracking}` : ''}\n\nThank you for shopping with Shlvy.`],
  ];

  return (
    <div className="adm-drawer-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="adm-drawer" role="dialog" aria-label={`Order ${ref}`}>
        <div className="adm-row" style={{justifyContent: 'space-between'}}>
          <div><span className="adm-muted adm-small">REQUEST {ref}</span><h2>{order.name}</h2></div>
          <button className="adm-btn ghost sm" onClick={onClose}>✕ Close</button>
        </div>
        <div className="adm-card">
          <dl className="adm-kv">
            <dt>Type</dt><dd>{order.requestType === 'purchase' ? 'Buy an example design' : 'Custom design brief'}</dd>
            {order.selectedDesign && (<><dt>Design</dt><dd><b>{order.selectedDesign}</b></dd></>)}
            <dt>Email</dt><dd><a href={`mailto:${order.email}`}><u>{order.email}</u></a></dd>
            <dt>Phone model</dt><dd>{order.model}</dd>
            {order.requestType === 'custom' && (<>
              <dt>Interests</dt><dd>{order.interests.join(', ') || '—'}</dd>
              <dt>Aesthetic</dt><dd>{order.style}</dd>
              <dt>Colours</dt><dd>{order.palette}</dd>
            </>)}
            <dt>Their notes</dt><dd style={{whiteSpace: 'pre-wrap'}}>{order.notes || '—'}</dd>
            <dt>Received</dt><dd>{when(order.createdAt)}</dd>
          </dl>
          {order.referenceUrl && (
            <div style={{marginTop: 14}}>
              <div className="adm-muted adm-small" style={{marginBottom: 6}}>Reference image — {order.referenceName}</div>
              <a href={order.referenceUrl} target="_blank"><img src={order.referenceUrl} alt="Customer reference" style={{maxWidth: '100%', maxHeight: 260, borderRadius: 10}} /></a>
            </div>
          )}
        </div>

        <div className="adm-card" style={{display: 'flex', flexDirection: 'column', gap: 12}}>
          <h3>Process this order</h3>
          <label className="f">Status
            <select value={form.status} onChange={e => setForm({...form, status: e.target.value as Order['status']})}>
              {ORDER_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </label>
          <div className="adm-row" style={{alignItems: 'stretch'}}>
            <label className="f" style={{flex: 1}}>Price quoted<input className="adm-input" placeholder="e.g. ₹499" value={form.price} onChange={e => setForm({...form, price: e.target.value})} /></label>
            <label className="f" style={{flex: 1}}>Tracking number<input className="adm-input" placeholder="Courier + number" value={form.tracking} onChange={e => setForm({...form, tracking: e.target.value})} /></label>
          </div>
          <label className="f">Private notes (customers never see these)<textarea value={form.adminNotes} onChange={e => setForm({...form, adminNotes: e.target.value})} /></label>
          {msg.err && <div className="adm-err">{msg.err}</div>}
          {msg.ok && <div className="adm-okmsg">{msg.ok}</div>}
          <div className="adm-row">
            <button className="adm-btn orange" disabled={busy} onClick={() => save()}>{busy ? 'Saving…' : 'Save changes'}</button>
            {NEXT_STEP[order.status] && <button className="adm-btn ghost" disabled={busy} onClick={() => save({...form, status: NEXT_STEP[order.status] as Order['status']})}>Mark as {NEXT_STEP[order.status]} →</button>}
          </div>
        </div>

        <div className="adm-card" style={{display: 'flex', flexDirection: 'column', gap: 10}}>
          <h3>Email the customer</h3>
          <p className="adm-muted adm-small" style={{margin: 0}}>Opens your email app with a ready-made message you can edit before sending.</p>
          <div className="adm-row">
            {templates.map(([label, s, b]) => <a key={label} className="adm-btn ghost sm" href={mail(s, b)}>✉ {label}</a>)}
            <a className="adm-btn ghost sm" href={mail(`Your Shlvy request ${ref}`, `Hi ${order.name},\n\n`)}>✉ Blank email</a>
          </div>
        </div>

        <div className="adm-card">
          <h3 style={{marginBottom: 10}}>History</h3>
          <ul className="adm-history">
            {[...(order.history ?? [])].reverse().map((h, i) => <li key={i}><time>{when(h.at)}</time><span>{h.text}</span></li>)}
          </ul>
        </div>
        <button className="adm-btn danger" style={{alignSelf: 'flex-start'}} onClick={remove}>Delete this request</button>
      </div>
    </div>
  );
}
