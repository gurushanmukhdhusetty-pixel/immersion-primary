# Shlvy — phone case shop + admin panel

This folder is the whole Shlvy website: the shop customers see, and a private **admin panel** where you handle orders and products.

---

## How it fits together (the simple version)

```
   Customer's phone/laptop                         You (the owner)
            │                                            │
            ▼                                            ▼
   ┌─────────────────┐                        ┌──────────────────────┐
   │   THE SHOP      │                        │   ADMIN PANEL        │
   │  your-site.com  │                        │  your-site.com/admin │
   │                 │                        │  (username+password) │
   └────────┬────────┘                        └──────────┬───────────┘
            │  "Buy this design" / custom brief          │ read & update orders,
            ▼                                            ▼ add/edit products
   ┌──────────────────────────────────────────────────────────────────┐
   │                        VERCEL (hosting)                          │
   │   ┌────────────────────────┐     ┌────────────────────────────┐  │
   │   │ Upstash Redis          │     │ Vercel Blob                │  │
   │   │ = the "notebook"       │     │ = the "photo album"        │  │
   │   │ orders + product list  │     │ product photos + customer  │  │
   │   │                        │     │ reference images           │  │
   │   └────────────────────────┘     └────────────────────────────┘  │
   └──────────────────────────────────────────────────────────────────┘
```

* **Vercel** runs the website. You never touch a server.
* **Upstash Redis** (free) is where orders and your product list are written down.
* **Vercel Blob** (free tier) stores pictures you or customers upload.
* There are **no payments on the website**. A customer sends a request → you email them a price → they pay you the way you agree (UPI, bank transfer, etc.).

---

## Signing in to the admin panel

Go to **`https://<your-site>/admin`** and use the username and password stored in Vercel
(Project → **Settings → Environment Variables** → `ADMIN_USERNAME` and `ADMIN_PASSWORD`).

**To change the password:** edit `ADMIN_PASSWORD` there → Save → **Deployments** tab → **⋯** on the newest one → **Redeploy**.

## What you can do in the admin panel

| Page | What it's for |
|---|---|
| **Dashboard** | New requests waiting for a reply, open orders, money earned, most-wanted designs. |
| **Orders & requests** | Every request from the website. Search, filter by stage, open one to see all details and the customer's reference image. Set the price, tracking number and private notes. Move it through the stages **New → Contacted → Confirmed → Paid → Shipped → Delivered** (or Cancelled). One-click ready-made emails (price quote, payment received, shipped). Download everything as a spreadsheet. |
| **Products** | Add a new design (photo + name + category), edit, hide/show, move up/down in the shop, delete. Give a design **colour options** (name + colour picker): customers must pick one when they click *Buy this design*, and the colour shows on the order. Each colour can have its own photo (**Add photo** next to the colour); the shop swaps to that photo when the colour is picked. A new category automatically becomes a new filter button on the shop. |
| **Setup & help** | Shows green ticks when the database and image storage are connected, and what to click if not. |

---

## First-time setup on Vercel (one time, ~5 minutes, no coding)

1. **Import the project** — vercel.com → *Add New… → Project* → pick this GitHub repository.
   Set **Root Directory** to `shlvy`. Framework is detected as **Next.js**. Don't deploy yet if it asks — or do, it's fine.
2. **Add the login** — *Settings → Environment Variables*, add:
   * `ADMIN_USERNAME` = your username
   * `ADMIN_PASSWORD` = a strong password
3. **Connect the database** — *Storage* tab → **Create Database** → **Upstash for Redis** → free plan → *Connect* to this project.
4. **Connect image storage** — *Storage* tab → **Create** → **Blob** → *Connect* to this project.
5. **Redeploy** — *Deployments* → **⋯** on the newest deployment → **Redeploy**.
6. Visit `/admin`, sign in, open **Setup & help** — all three should be green ✓.

> Until step 3 is done the shop still shows all 20 designs, but orders can't be saved.

**Your own domain:** Project → *Settings → Domains* → add e.g. `shlvy.in` and follow the DNS instructions shown.

---

## For a developer

* Next.js 16 (App Router), React 19, no CSS framework. `npm install`, then `npm run dev`.
* Copy `.env.example` → `.env.local` and set the admin login. With no Redis/Blob keys, data is saved to `.data/` on your computer.
* Shop: `app/page.tsx` (loads products) → `app/Storefront.tsx` (original design, unchanged except it reads products from the database), `app/globals.css`, `app/Atmosphere.tsx`.
* Admin: `app/admin/**`, styles in `app/admin/admin.css` (scoped under `.adm`).
* API: `app/api/briefs` (public order form), `app/api/admin/*` (login-protected), `app/api/files/*` (images; customer reference images are admin-only).
* Data: `lib/store.ts` (Redis keys `shlvy:products`, `shlvy:order:<id>`, `shlvy:orders`), `lib/files.ts` (Blob), `lib/auth.ts` (signed cookie, 7-day session).
* The original 20 designs are in `lib/default-products.ts` and `public/designs/`. They're used until you first save a change in **Products**.
* Uploads are limited to 4 MB because of Vercel's request size limit.
