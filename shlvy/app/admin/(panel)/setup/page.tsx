import {storageConnected} from '@/lib/store';
import {adminConfigured} from '@/lib/auth';

function Check({ok, title, children}: {ok: boolean; title: string; children: React.ReactNode}) {
  return (
    <div className="adm-check">
      <div className={`dot ${ok ? 'y' : 'n'}`}>{ok ? '✓' : '!'}</div>
      <div><h3>{title} — {ok ? 'connected' : 'not connected yet'}</h3><p>{children}</p></div>
    </div>
  );
}

export default function Setup() {
  const db = storageConnected(), blob = !!process.env.BLOB_READ_WRITE_TOKEN, login = adminConfigured();
  return (
    <>
      <div className="adm-top"><div><h1>Setup &amp; help</h1><p>How your shop is put together, and what to click if something isn’t connected.</p></div></div>
      <div className="adm-card" style={{marginBottom: 16}}>
        <Check ok={db} title="Database (orders & product list)">
          Stores every order and your product list. To connect: Vercel → your project → <b>Storage</b> → <b>Create / Connect</b> → <b>Upstash for Redis</b> (free plan) → Connect to project → then <b>Deployments → ⋯ → Redeploy</b>.
        </Check>
        <Check ok={blob} title="Image storage (product photos & customer reference images)">
          Stores pictures you upload. To connect: Vercel → your project → <b>Storage</b> → <b>Create</b> → <b>Blob</b> → Connect to project → Redeploy.
        </Check>
        <Check ok={login} title="Admin login">
          Your username and password live in Vercel → project → <b>Settings → Environment Variables</b> as <code>ADMIN_USERNAME</code> and <code>ADMIN_PASSWORD</code>. To change the password, edit the value there and Redeploy.
        </Check>
      </div>
      <div className="adm-card" style={{display: 'flex', flexDirection: 'column', gap: 10}}>
        <h2>Day-to-day: handling an order</h2>
        <ol style={{margin: 0, paddingLeft: 20, lineHeight: 1.8}}>
          <li>A customer clicks <b>Buy this design</b> or sends a <b>custom brief</b> → it appears in <a href="/admin/orders"><u>Orders</u></a> as <span className="badge New">New</span>.</li>
          <li>Open it, check the phone model, type a price, and click <b>✉ Send price quote</b>. Mark it <span className="badge Contacted">Contacted</span>.</li>
          <li>When they say yes → <span className="badge Confirmed">Confirmed</span>. When money arrives → <span className="badge Paid">Paid</span>.</li>
          <li>Post it, paste the tracking number → <span className="badge Shipped">Shipped</span> → <b>✉ Shipped</b> email. Later → <span className="badge Delivered">Delivered</span>.</li>
        </ol>
        <p className="adm-muted" style={{margin: 0}}>The website does not take payments by itself — you agree the price and payment method with the customer by email.</p>
      </div>
    </>
  );
}
