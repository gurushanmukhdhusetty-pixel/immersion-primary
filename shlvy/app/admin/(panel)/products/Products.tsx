'use client';
import {useEffect, useState} from 'react';
import {BASE_CATEGORIES, type Product} from '@/lib/types';
import {api} from '../../ui';

export default function Products() {
  const [list, setList] = useState<Product[] | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    api<Product[]>('/api/admin/products').then(setList, e => setError(e.message));
  }, []);

  const categories = Array.from(new Set([...BASE_CATEGORIES, ...(list ?? []).map(p => p.category)]));
  const shown = (list ?? []).filter(p => filter === 'All' || (filter === 'Hidden' ? !p.visible : p.category === filter));

  async function move(id: string, dir: -1 | 1) {
    if (!list) return;
    const i = list.findIndex(p => p.id === id), j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
    try {
      setList(await api<Product[]>('/api/admin/products', {method: 'PUT', headers: {'content-type': 'application/json'}, body: JSON.stringify(next.map(p => p.id))}));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function toggle(p: Product) {
    const fd = new FormData();
    for (const k of ['name', 'category', 'theme', 'price'] as const) fd.append(k, p[k]);
    fd.append('visible', String(!p.visible));
    try {
      const saved = await api<Product>(`/api/admin/products/${p.id}`, {method: 'PATCH', body: fd});
      setList(l => l?.map(x => (x.id === p.id ? saved : x)) ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function remove(p: Product) {
    if (!confirm(`Delete “${p.name}” from the shop? This cannot be undone. (Tip: use “Hide” to take it off the shop temporarily.)`)) return;
    try {
      await api(`/api/admin/products/${p.id}`, {method: 'DELETE'});
      setList(l => l?.filter(x => x.id !== p.id) ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <div className="adm-top">
        <div><h1>Products</h1><p>Add new case designs, edit names and prices, hide or reorder what shows in the shop.</p></div>
        <button className="adm-btn orange" onClick={() => setEditing('new')}>＋ Add a design</button>
      </div>
      <div className="adm-pills" style={{marginBottom: 16}}>
        {['All', ...categories, 'Hidden'].map(c => <button key={c} className={filter === c ? 'on' : ''} onClick={() => setFilter(c)}>{c}</button>)}
      </div>
      {error && <div className="adm-err" style={{marginBottom: 16}}>{error}</div>}
      {!list && !error && <p className="adm-muted">Loading…</p>}
      <div className="adm-grid adm-products">
        {shown.map(p => (
          <div key={p.id} className={`adm-card adm-prod ${p.visible ? '' : 'hidden'}`}>
            <div className="img"><img src={p.image} alt={p.name} loading="lazy" /></div>
            <div className="body">
              <div className="adm-row" style={{justifyContent: 'space-between'}}>
                <h3>{p.name}</h3>
                <span className={`badge ${p.visible ? 'Paid' : 'Cancelled'}`}>{p.visible ? 'Live' : 'Hidden'}</span>
              </div>
              <div className="adm-muted adm-small">{p.category}{p.theme !== p.category ? ` · ${p.theme}` : ''}{p.price ? ` · ${p.price}` : ''}</div>
              <div className="adm-row" style={{marginTop: 'auto'}}>
                <button className="adm-btn sm" onClick={() => setEditing(p)}>Edit</button>
                <button className="adm-btn ghost sm" onClick={() => toggle(p)}>{p.visible ? 'Hide' : 'Show'}</button>
                {filter === 'All' && <>
                  <button className="adm-btn ghost sm" title="Move earlier in the shop" onClick={() => move(p.id, -1)}>↑</button>
                  <button className="adm-btn ghost sm" title="Move later in the shop" onClick={() => move(p.id, 1)}>↓</button>
                </>}
                <button className="adm-btn danger sm" onClick={() => remove(p)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <ProductForm
          product={editing === 'new' ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={p => {
            setList(l => (editing === 'new' ? [p, ...(l ?? [])] : l?.map(x => (x.id === p.id ? p : x)) ?? null));
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function ProductForm({product, categories, onClose, onSaved}: {product: Product | null; categories: string[]; onClose: () => void; onSaved: (p: Product) => void}) {
  const [f, setF] = useState({name: product?.name ?? '', category: product?.category ?? 'Unisex', theme: product?.theme ?? '', price: product?.price ?? '', visible: product?.visible ?? true});
  const [newCat, setNewCat] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(product?.image ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const category = f.category === '__new' ? newCat.trim() : f.category;
    if (!category) {
      setErr('Type a name for the new category.');
      setBusy(false);
      return;
    }
    const fd = new FormData();
    fd.append('name', f.name);
    fd.append('category', category);
    fd.append('theme', f.theme || (BASE_CATEGORIES.includes(category) && category === 'Unisex' ? 'Everyday graphics' : category));
    fd.append('price', f.price);
    fd.append('visible', String(f.visible));
    if (file) fd.append('image', file);
    try {
      const saved = await api<Product>(product ? `/api/admin/products/${product.id}` : '/api/admin/products', {method: product ? 'PATCH' : 'POST', body: fd});
      onSaved(saved);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="adm-modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <form className="adm-modal" onSubmit={submit}>
        <div className="adm-row" style={{justifyContent: 'space-between'}}>
          <h2>{product ? `Edit “${product.name}”` : 'Add a new design'}</h2>
          <button type="button" className="adm-btn ghost sm" onClick={onClose}>✕</button>
        </div>
        <div className="adm-row" style={{alignItems: 'flex-start'}}>
          <div style={{width: 120, height: 170, background: '#eceade', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
            {preview ? <img src={preview} alt="" style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain'}} /> : <span className="adm-muted adm-small">No photo</span>}
          </div>
          <label className="f" style={{flex: 1}}>
            Product photo {product ? '(optional — only to replace it)' : ''}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            <span style={{fontWeight: 400}}>JPG, PNG or WebP under 4 MB. Best: a tall case photo on a transparent or plain background (like the existing ones, 1024×1536).</span>
          </label>
        </div>
        <label className="f">Design name<input className="adm-input" required maxLength={100} value={f.name} onChange={e => setF({...f, name: e.target.value})} placeholder="e.g. Peach Bloom" /></label>
        <label className="f">Category (shop filter)
          <select value={f.category} onChange={e => setF({...f, category: e.target.value})}>
            {categories.map(c => <option key={c}>{c}</option>)}
            <option value="__new">＋ New category…</option>
          </select>
        </label>
        {f.category === '__new' && <input className="adm-input" placeholder="New category name" value={newCat} onChange={e => setNewCat(e.target.value)} />}
        <label className="f">Small label above the name (optional)<input className="adm-input" maxLength={100} value={f.theme} onChange={e => setF({...f, theme: e.target.value})} placeholder="e.g. Soft & playful — shows as “… • Silicone”" /></label>
        <label className="f">Price (for your reference when quoting)<input className="adm-input" maxLength={40} value={f.price} onChange={e => setF({...f, price: e.target.value})} placeholder="e.g. ₹499" /></label>
        <label className="adm-row" style={{fontWeight: 600}}><input type="checkbox" checked={f.visible} onChange={e => setF({...f, visible: e.target.checked})} /> Show this design in the shop</label>
        {err && <div className="adm-err">{err}</div>}
        <div className="adm-row">
          <button className="adm-btn orange" disabled={busy}>{busy ? 'Saving…' : product ? 'Save changes' : 'Add to shop'}</button>
          <button type="button" className="adm-btn ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
