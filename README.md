# GridIronIQ Monorepo

A clean starting point for **Frontend (Vite React on Netlify)**, **Backend (FastAPI)**, and **Database (Supabase Postgres with RLS)**.

This skeleton is aligned with the prior front‑end work (marker placement UI, analysis polling, build info footer) and sets up a safe-by-default backend + database with org-scoped access and strong RLS. See `infra/supabase` for SQL, RLS policies, and Storage rules.


## Structure

```
apps/
  web/             # Vite + React app (Netlify)
services/
  api/             # FastAPI service (jobs endpoints, CORS, Supabase client)
infra/
  supabase/        # SQL schema, RLS policies, Storage policies
.github/
  workflows/       # CI for lint/build/typecheck
netlify.toml       # Netlify build + SPA redirects
```

## Quick start

### 1) Supabase
1. Create a Supabase project.
2. In the SQL editor, run the files in order:
   - `infra/supabase/000_init.sql`
   - `infra/supabase/001_rls.sql`
   - `infra/supabase/002_storage.sql`
3. In the Dashboard → Storage, confirm a `videos` bucket exists (the SQL creates it if missing).
4. In Project Settings → API, copy:
   - `Project URL` → `SUPABASE_URL`
   - `anon` public key → `VITE_SUPABASE_ANON_KEY` (frontend)
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (backend only)

> **Note:** Profiles are created via the `rpc.init_user()` call from the app or API post-signup. No auth triggers needed.

### 2) Backend (FastAPI)
```
cd services/api
python -m venv .venv && . .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # fill in values
uvicorn app.main:app --reload
```

### 3) Frontend (Vite React)
```
cd apps/web
npm ci
cp .env.example .env  # fill in values
npm run dev
```

Open http://localhost:5173 (or shown port).

### 4) Netlify
- Connect repo.
- Build command: `npm run build`
- Publish directory: `apps/web/dist`
- Base directory: `apps/web`
- Set env vars in Netlify:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_API_URL` (your FastAPI URL)

## Org model & RLS overview
- Users belong to orgs via `org_members` (`role` = owner/admin/member).
- All domain tables include `org_id` and enforce access via RLS policies that allow only org members.
- Storage uses a **user-scoped** path convention (`user/{uid}/...`) for now to avoid JWT custom-claims; org-scoped storage can be added later if you prefer. Policies are included.

## First-run checklist
- [ ] Run SQL files in order.
- [ ] Create a test user via Supabase Auth.
- [ ] Call `rpc.init_user('My Team')` once to create `profiles`, an `org`, and membership.
- [ ] From the frontend, sign in and verify you can read/write only your org's rows.
- [ ] Create a job from the UI → observe status polling.
- [ ] Wire your actual CV pipeline into the worker behind `/jobs` when ready.

---

**Security notes**
- **Never** expose `SUPABASE_SERVICE_ROLE_KEY` to the frontend or Netlify UI builds.
- Backend CORS is locked down via `ALLOWED_ORIGINS` in `.env`.
- RLS is enabled on every table from day one. See the SQL for exact policies.
