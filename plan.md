# Philatelic Archive — Project Plan

Target architecture:
- **Frontend**: Azure Static Web Apps (built React app)
- **Backend**: Azure Container Apps (FastAPI)
- **Database**: MongoDB Atlas (free tier)
- **Images**: Cloudflare R2 (already in place)
- **CI/CD**: Azure DevOps pipelines (already have account)
- **Repo**: https://rlinville.visualstudio.com/Stamp%20Archive/_git/Stamp%20Archive

---

## Status Legend
- ✅ Complete
- 🔄 In Progress
- ⬜ Not Started

---

## ✅ Feature: Tag editing on the Edit Stamp page
Tags are displayed as removable chips on the Edit page. New tags can be added by typing and pressing Enter or clicking Add. Changes are saved with the stamp record.

---

## ✅ Feature: Quantity field
- Added `quantity` field to the Stamp model (default 1).
- Shown on Add Stamp and Edit Stamp pages.
- Collection view shows quantity in grey next to stamp name when > 1.
- Statistics page calculates total value as `value × quantity`.
- Migration script `db_migrations/add_quantity_field.py` backfilled all existing stamps with `quantity: 1`.

---

## ✅ Feature: Country sidebar filter with multi-select
- Replaced country badge buttons with a sticky sidebar showing each country and its stamp count.
- Search input stays pinned at the top of the sidebar.
- Multiple countries can be selected simultaneously; selected countries are highlighted in blue.
- Clicking "All Countries" clears the filter.
- Backend `/countries/counts` endpoint added to support the sidebar.
- Backend `/stamps` updated to accept comma-separated country values for multi-select.

---

## ✅ Feature: Stamp grid redesign
- Replaced `react-window` fixed-size grid with a responsive CSS grid.
- Cards have a proper container with shadow, rounded corners, and a grey image background.
- No horizontal scrolling; columns adapt to screen width (2–5 columns).

---

## ✅ Feature: Pagination improvements
- Added `/stamps/count` backend endpoint.
- Pagination now shows "Page X of Y".
- Added a page jump input — type a page number and press Enter to navigate directly.

---

## ✅ Feature: Frontend tests (Vitest)
- 17 tests passing covering EditStampPage:
  - Tag add/remove, duplicate prevention, blank tag prevention, input clears after add
  - Image upload: uploading state, success, preview URL update, server error, network failure
  - Form loading: condition dropdown, name field, value formatted to 2 decimal places
  - Edge cases: stamp with no tags, network failure on upload

---

## ✅ Issue 1: Upload all local images to Cloudflare R2
All stamp images migrated from local `D:/Stamps` to Cloudflare R2. Every stamp record in MongoDB has an `image_url` starting with `https://`.

---

## ✅ Issue 5: Migrate database to MongoDB Atlas
- Atlas cluster activated (existing cluster reused).
- IP allowlist configured.
- 457 stamps migrated via `db_migrations/migrate_to_atlas.py`.
- API confirmed connecting to Atlas (verified by stopping local MongoDB container).
- Backend Dockerfile updated to install `ca-certificates` for TLS compatibility.
- `MONGODB_URL` now read from environment variable (previously hardcoded).
- Local `stamp_db` container retained for now as a fallback during transition.

---

## ⬜ Issue 2: Replace hardcoded `localhost:8000` with an environment variable

**Problem:** `API_BASE` is hardcoded to `http://localhost:8000` in `App.tsx`, `EditStampPage.tsx`, `AddStampPage.tsx`, and `StatisticsPage.tsx`. This will break when the API is hosted at a real URL.

**Plan:**
- Change `API_BASE` to read from a Vite environment variable: `import.meta.env.VITE_API_BASE_URL`
- Create `frontend/.env` for local dev: `VITE_API_BASE_URL=http://localhost:8000`
- In Azure Static Web Apps, set `VITE_API_BASE_URL` to the Container Apps URL at build time.
- **Note:** This is also a good time to refactor API calls into custom hooks in `src/hooks/` (e.g. `useStamps`, `useCountryCounts`) to keep `App.tsx` clean.

**Done when:** No hardcoded `localhost` URLs remain in the frontend source.

---

## ⬜ Issue 3: Build the frontend for production (replace Vite dev server)

**Problem:** The frontend Docker container currently runs `vite dev`, which is not suitable for production.

**Plan:**
- Update `frontend/Dockerfile` to a two-stage build: Node runs `npm run build`, Nginx serves `dist/`.
- Alternatively, Azure Static Web Apps handles the build automatically from the DevOps repo.
- Remove `--reload` flag from backend `Dockerfile` CMD for production.
- Fix CORS in `backend/main.py` — currently `allow_origins=["*"]`, needs to be locked to the Static Web Apps domain.

**Done when:** Frontend is served as a static build, not a dev server.

---

## ⬜ Issue 4: Move secrets out of the `.env` file

**Problem:** `.env` contains R2 credentials and MongoDB connection string. Cannot be committed or used on a cloud host.

**Plan:**
- Confirm `.env` is in `.gitignore` ✅
- In Azure Container Apps, configure all variables as secrets:
  - `MONGODB_URL`
  - `R2_ENDPOINT_URL`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME`
  - `R2_PUBLIC_URL`

**Done when:** App runs in Azure with no `.env` file; all secrets injected via Azure config.

---

## ⬜ Issue 6: Deploy backend to Azure Container Apps

**Plan:**
- Create Azure Container Registry (ACR).
- Create Azure DevOps pipeline: build image → push to ACR → deploy to Container App.
- Configure Container App with all environment variables from Issue 4.
- Note the public URL — this becomes `VITE_API_BASE_URL` for Issue 2.

**Done when:** `https://<container-app>.azurecontainerapps.io/stamps` returns data.

---

## ⬜ Issue 7: Deploy frontend to Azure Static Web Apps

**Plan:**
- Create Azure Static Web App linked to the DevOps repo.
- Build settings: app location `frontend`, build command `npm run build`, output `dist`.
- Set `VITE_API_BASE_URL` to the Container Apps URL from Issue 6.
- Update CORS in `backend/main.py` to allow the Static Web Apps domain.

**Done when:** Frontend loads at the Azure Static Web Apps URL and can reach the API.

---

## ⬜ Feature: Backend tests (pytest)
- Use `pytest` and `httpx` async test client.
- Key tests: `GET /stamps`, `GET /stamps/{country}/{scott_number}`, `PUT`, `GET /countries`, sort order, quantity in statistics.
- Use a separate test MongoDB database.
- Add to Azure DevOps pipeline to run on every PR.

---

## ⬜ Feature: Refactor API calls into custom hooks
- Move all `useQuery` calls out of `App.tsx` into `src/hooks/` (e.g. `useStamps.ts`, `useCountryCounts.ts`).
- Best done alongside Issue 2 since all API files will be touched anyway.

---

## ⬜ Future: Authentication
- Currently no login — anyone with the URL can add/edit/delete stamps.
- Acceptable for local/personal use but required before any public hosting.
- Options: Azure AD B2C, Auth0, or simple API key.

---

## ⬜ Future: Remove local MongoDB from docker-compose
- Once confident in Atlas, remove the `db` service and `depends_on: db` from `docker-compose.yml`.
- Local dev will use Atlas directly.

---

## Recommended order of remaining work

1. ⬜ Issue 2 — environment variable + custom hooks refactor
2. ⬜ Issue 4 — move secrets to Azure config
3. ⬜ Issue 6 — deploy backend to Container Apps
4. ⬜ Issue 3 — production frontend build + CORS fix
5. ⬜ Issue 7 — deploy frontend to Static Web Apps
6. ⬜ Backend tests
7. ⬜ Authentication (before any public URL)
