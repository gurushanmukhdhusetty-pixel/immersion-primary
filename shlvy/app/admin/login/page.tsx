'use client';
import {useState} from 'react';
import '../admin.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/admin/login', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({username, password})});
    const data = await res.json().catch(() => ({}));
    if (res.ok) window.location.href = '/admin';
    else {
      setError(data.error || 'Could not sign in.');
      setBusy(false);
    }
  }
  return (
    <div className="adm">
      <div className="adm-login">
        <form className="adm-card" onSubmit={submit}>
          <div className="adm-brand" style={{padding: 0}}>shlvy<span>✳︎</span><small>ADMIN</small></div>
          <h2>Sign in to your shop</h2>
          <label className="f">Username<input className="adm-input" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required /></label>
          <label className="f">Password<input className="adm-input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
          {error && <div className="adm-err">{error}</div>}
          <button className="adm-btn orange" disabled={busy} style={{justifyContent: 'center'}}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <a href="/" className="adm-muted adm-small">← Back to the shop</a>
        </form>
      </div>
    </div>
  );
}
