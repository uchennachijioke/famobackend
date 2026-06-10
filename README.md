# FAMO Backend (Node.js / Express)

Replaces the Supabase Edge Functions for the FAMO delivery platform with a
single Express server. It still uses the **same Supabase project** for the
database, storage, RPCs, RLS and Realtime — only the HTTP layer moved here.

## What it exposes

Every route mirrors the old Edge Function 1:1 (same path, request body and
response shape), so clients only need to change the **base URL**.

| Method & path             | Auth                  | Purpose                                  |
| ------------------------- | --------------------- | ---------------------------------------- |
| `GET  /health`            | none                  | Health check                             |
| `POST /rider-auth`        | none (issues token)   | Rider signup / login                     |
| `POST /rider-location`    | rider token           | Upsert rider GPS                         |
| `POST /rider-deliveries`  | rider token           | Read offered / active delivery           |
| `POST /rider-respond-offer` | rider token         | Accept / decline an offer                |
| `POST /rider-update-delivery` | rider token       | Advance delivery status                  |
| `POST /rider-profile`     | rider token           | Get / update profile, submit application |
| `POST /rider-documents`   | rider token           | Signed upload / download URLs            |
| `POST /rider-delete`      | rider token           | Delete rider account                     |
| `POST /geo`               | user JWT              | Google Maps proxy (autocomplete/details/directions) |

**Rider token** = the session token returned by `POST /rider-auth` (action
`login`). Send it as `Authorization: Bearer <token>`, or `x-rider-token: <token>`,
or `{ "token": "<token>" }` in the body.

**User JWT** = a logged-in user's Supabase access token. Send it as
`Authorization: Bearer <jwt>`. The user app attaches this automatically.

## Local development

```bash
cd famo-backend
cp .env.example .env      # then fill in the values
npm install
npm run dev               # starts on http://localhost:8080 with hot reload
```

Fill `.env`:

- `SUPABASE_URL` — already set to the project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase Dashboard → Project Settings → API →
  `service_role` secret. **Keep this secret. Never ship it to the app.**
- `GOOGLE_MAPS_API_KEY` — your Google Maps server key (Places, Geocoding,
  Directions APIs enabled).

Quick test:

```bash
curl http://localhost:8080/health
# {"ok":true,"service":"famo-backend"}
```

### Pointing the apps at a local backend

Mobile devices can't reach `localhost` on your PC. Use:

- **Android emulator:** `http://10.0.2.2:8080`
- **Physical device:** `http://<your-PC-LAN-IP>:8080` (same Wi‑Fi)

Set this as `EXPO_PUBLIC_BACKEND_URL` in the user app's `.env`, and as the base
URL in the rider app.

## Deploy to Render (recommended)

1. Push this `famo-backend` folder to a GitHub repo.
2. Render Dashboard → **New → Web Service** → connect the repo.
3. Settings:
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Add **Environment Variables** (from your `.env`):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GOOGLE_MAPS_API_KEY`
   - (Render sets `PORT` automatically — leave it unset.)
5. Deploy. You'll get a URL like `https://famo-backend.onrender.com`.
6. Put that URL in:
   - User app `.env` → `EXPO_PUBLIC_BACKEND_URL`
   - Rider app → its backend base URL

> Note: Render's free tier sleeps after inactivity, so the first request after
> idle can take ~30s. Fine for testing; upgrade for production.

## Migrating the rider app (IMPORTANT)

The rider app currently calls Supabase Edge Functions at
`https://<project>.supabase.co/functions/v1/<slug>`. Re-point each call to this
backend:

```
https://<project>.supabase.co/functions/v1/rider-auth   ->  <BACKEND_URL>/rider-auth
.../functions/v1/rider-location                          ->  <BACKEND_URL>/rider-location
.../functions/v1/rider-deliveries                        ->  <BACKEND_URL>/rider-deliveries
.../functions/v1/rider-respond-offer                     ->  <BACKEND_URL>/rider-respond-offer
.../functions/v1/rider-update-delivery                   ->  <BACKEND_URL>/rider-update-delivery
.../functions/v1/rider-profile                           ->  <BACKEND_URL>/rider-profile
.../functions/v1/rider-documents                         ->  <BACKEND_URL>/rider-documents
.../functions/v1/rider-delete                            ->  <BACKEND_URL>/rider-delete
```

Request bodies and responses are unchanged. The rider app no longer needs to
send the Supabase `apikey` / anon Bearer — only the rider token (any of the
three accepted forms above). Realtime subscriptions (offers, tracking) stay on
Supabase and are unaffected.

## Notes / differences from the Edge Functions

- `rider-profile` token verification was fixed to use the correct DB parameter
  name (`p_token`); the Edge Function had a latent bug calling it with `token`.
- The database, RPCs (`rider_signup`, `rider_login`, `rider_verify_token`,
  `accept_offer`, `decline_offer`), Storage bucket and RLS are unchanged.
- The old Edge Functions can be left deployed during migration and deleted once
  both apps point here.
