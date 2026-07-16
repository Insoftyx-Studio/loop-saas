# Loop — client portal for agencies

A branded, two-sided client portal. **Agency side** manages every client, project,
deliverable, request, invoice, and update from one dashboard. **Client side** is a calm,
branded portal where each client sees only their own engagement — and closes the
*approval loop* by approving or commenting on shared work.

This is the **frontend** (a real Vite + React + TypeScript app), designed to be wired to a
backend later. All data is mock data seeded in memory and persisted to `localStorage`, so
your clicks stick between refreshes.

## Run it

```bash
npm install
npm run dev
```

Then open the printed URL (usually http://localhost:5173).

To build for production: `npm run build` (output in `dist/`), preview with `npm run preview`.

## Try the demo

The login screen has **two demo logins, no sign-up**:

- **Explore as an agency** → the full dashboard (Northwind Studio, 3 clients).
- **Explore as a client** → pick one of the three clients and see their branded portal.

**Feel the loop:** open a client portal → *Waiting on you* → **Approve** a deliverable
(watch the check draw). Then log in as the agency → **Deliverables** → the status has
flipped to *Approved*. That's the approval loop.

Other things that actually work: add a client (with their own portal accent), submit a
request as a client and advance it on the agency side, post an update, toggle the theme
(smooth circular reveal), everything responsive.

To wipe demo state, clear the site's `localStorage` (keys `loop-db-v1`, `loop-session-v1`),
or call `useStore().reset()`.

## Stack

React 18 · TypeScript · Vite · Tailwind CSS v3 · Framer Motion · React Router · lucide-react.
Fonts: General Sans (UI), Instrument Serif (display), Geist Mono (numbers/IDs).

## Notes

- **Frontend only.** Auth, a real database, and multi-tenant row-level security are the
  next phase; the session/role model here mirrors that boundary so it maps cleanly onto,
  e.g., Supabase later.
- Deliverable thumbnails load from `picsum.photos` for the demo.
- Northwind Studio and its clients are fictional.
