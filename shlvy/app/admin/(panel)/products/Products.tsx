'use client';
import {useEffect, useState} from 'react';
import {BASE_CATEGORIES, type Product, type ProductColor} from '@/lib/types';
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
    fd.append('colors', JSON.stringify(p.colors ?? []));
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
              {!!p.colors?.length && (
                <div className="adm-row" style={{gap: 4}} title={p.colors.map(c => c.name).join(', ')}>
                  {p.colors.map(c => <span key={c.name} style={{width: 16, height: 16, borderRadius: '50%', background: c.hex, border: '1px solid #0002'}} />)}
                  <span className="adm-muted adm-small">{p.colors.length} colour{p.colors.length > 1 ? 's' : ''}</span>
                </div>
              )}
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
  const [colors, setColors] = useState<ProductColor[]>(product?.colors ?? []);
  const [uploading, setUploading] = useState<number | null>(null);
  async function uploadColour(i: number, file: File | undefined) {
    if (!file) return;
    setUploading(i);
    setErr('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      const {url} = await api<{url: string}>('/api/admin/upload', {method: 'POST', body: fd});
      setColors(cs => cs.map((x, j) => (j === i ? {...x, image: url} : x)));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(null);
    }
  }
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
    fd.append('colors', JSON.stringify(colors.filter(c => c.name.trim())));
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
        <div className="f" style={{display: 'flex', flexDirection: 'column', gap: 8}}>
          <span style={{fontWeight: 600, fontSize: 12, color: 'var(--muted)'}}>Colour options (customers choose one when they buy — leave empty for “as pictured”). Add a photo for each colour so customers see the right case; colours without a photo show the main photo.</span>
          {colors.map((c, i) => (
            <div key={i} className="adm-row" style={{flexWrap: 'nowrap'}}>
              <input type="color" value={c.hex} onChange={e => setColors(colors.map((x, j) => (j === i ? {...x, hex: e.target.value} : x)))} style={{width: 44, height: 40, padding: 2, border: '1px solid var(--line)', borderRadius: 8, background: '#fff', flex: 'none'}} aria-label="Pick colour" />
              <input className="adm-input" placeholder="Colour name, e.g. Midnight Black" maxLength={40} value={c.name} onChange={e => setColors(colors.map((x, j) => (j === i ? {...x, name: e.target.value} : x)))} />
              <label className="adm-btn ghost sm" style={{flex: 'none', gap: 6}} title="Photo of the case in this colour">
                {c.image ? <img src={c.image} alt="" style={{width: 18, height: 26, objectFit: 'contain'}} /> : '📷'}
                {uploading === i ? 'Uploading…' : c.image ? 'Change photo' : 'Add photo'}
                <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => { uploadColour(i, e.target.files?.[0]); e.target.value = ''; }} />
              </label>
              {c.image && <button type="button" className="adm-btn ghost sm" title="Use the main photo for this colour" onClick={() => setColors(colors.map((x, j) => (j === i ? {name: x.name, hex: x.hex} : x)))}>No photo</button>}
              <button type="button" className="adm-btn danger sm" onClick={() => setColors(colors.filter((_, j) => j !== i))} aria-label="Remove colour">✕</button>
            </div>
          ))}
          <div className="adm-row">
            <button type="button" className="adm-btn ghost sm" onClick={() => setColors([...colors, {name: '', hex: '#252921'}])}>＋ Add a colour</button>
            {['Black|#1d1d1f', 'White|#f7f7f2', 'Cream|#efe6d2', 'Sage|#a8b79a', 'Baby Pink|#f2c4cf', 'Navy|#1f2a44'].map(q => q.split('|')).filter(([name]) => !colors.some(c => c.name.toLowerCase() === name.toLowerCase())).map(([name, hex]) => {
              return <button type="button" key={name} className="adm-btn ghost sm" onClick={() => setColors([...colors, {name, hex}])}><span style={{width: 10, height: 10, borderRadius: '50%', background: hex, border: '1px solid #0003'}} />{name}</button>;
            })}
          </div>
        </div>
        <label className="f">Price (for your reference when quoting)<input className="adm-input" maxLength={40} value={f.price} onChange={e => setF({...f, price: e.target.value})} placeholder="e.g. ₹499" /></label>
        <label className="adm-row" style={{fontWeight: 600}}><input type="checkbox" checked={f.visible} onChange={e => setF({...f, visible: e.target.checked})} /> Show this design in the shop</label>
        {err && <div className="adm-err">{err}</div>}
        <div className="adm-row">
          <button className="adm-btn orange" disabled={busy || uploading !== null}>{busy ? 'Saving…' : product ? 'Save changes' : 'Add to shop'}</button>
          <button type="button" className="adm-btn ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
