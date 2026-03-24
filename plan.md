# Azure Hosting Migration Plan

Target architecture:
- **Frontend**: Azure Static Web Apps (built React app)
- **Backend**: Azure Container Apps (FastAPI)
- **Database**: MongoDB Atlas (free tier)
- **Images**: Cloudflare R2 (already in place)
- **CI/CD**: Azure DevOps pipelines (already have account)

---

## Issue 1: Upload all local images to Cloudflare R2

**Problem:** Stamp images are currently served from `D:/Stamps` on the local machine via a Docker volume mount. This path does not exist in the cloud.

**Plan:**
- Write a one-time Python script that reads all stamps from MongoDB, finds any `image_url` that is not an `http` URL (i.e. a local filename), reads the file from `D:/Stamps`, uploads it to R2, and updates the stamp record in MongoDB with the new public URL.
- Once all images are migrated, remove the `D:/Stamps` volume mount from `docker-compose.yml`.

**Done when:** Every stamp in MongoDB has an `image_url` starting with `https://`.

---

## Issue 2: Replace hardcoded `localhost:8000` with an environment variable

**Problem:** `API_BASE` is hardcoded to `http://localhost:8000` in both `frontend/src/App.tsx` and `frontend/src/components/EditStampPage.tsx`. This will break when the API is hosted at a real URL.

**Plan:**
- Change `API_BASE` to read from a Vite environment variable: `import.meta.env.VITE_API_BASE_URL`
- Create a `frontend/.env` file for local development: `VITE_API_BASE_URL=http://localhost:8000`
- In Azure Static Web Apps, set `VITE_API_BASE_URL` to the Container Apps API URL at build time.

**Done when:** No hardcoded `localhost` URLs remain in the frontend source.

---

## Issue 3: Build the frontend for production (replace Vite dev server)

**Problem:** The frontend Docker container currently runs `vite dev`, which is a development server not suitable for production (slow, no optimisation, not designed for public traffic).

**Plan:**
- Update `frontend/Dockerfile` to use a two-stage build:
  1. Stage 1: Node image runs `npm run build` to produce a `dist/` folder.
  2. Stage 2: Nginx serves the `dist/` folder as static files.
- Alternatively, deploy to **Azure Static Web Apps** which handles the build automatically from the GitHub/DevOps repo — no Dockerfile needed for the frontend.

**Done when:** Frontend is served as a static build, not a dev server.

---

## Issue 4: Move secrets out of the `.env` file

**Problem:** The `.env` file contains R2 credentials and MongoDB connection strings. This file cannot be committed to source control and cannot exist on a cloud host.

**Plan:**
- Add `.env` to `.gitignore` (check it is already there).
- In Azure Container Apps, configure all environment variables from the `.env` file as Container App secrets/environment variables via the Azure portal or CLI.
- Variables to migrate:
  - `MONGODB_URL`
  - `R2_ENDPOINT_URL`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME`
  - `R2_PUBLIC_URL`

**Done when:** The app runs in Azure with no `.env` file, all secrets injected via Azure configuration.

---

## Issue 5: Migrate database to MongoDB Atlas

**Problem:** MongoDB is currently running as a Docker container. In the cloud this would need persistent storage configured, and is harder to manage than a hosted service.

**Plan:**
- Create a free MongoDB Atlas cluster (512MB free tier is enough for a stamp collection).
- Use `mongodump` locally to export the current database and `mongorestore` to import into Atlas.
- Update `MONGODB_URL` in Azure Container Apps config to point to the Atlas connection string instead of `mongodb://db:27017`.
- Remove the `db` service from `docker-compose.yml` for production (keep for local dev).

**Done when:** Atlas cluster is running and the API connects to it successfully.

---

## Issue 6: Set up Azure Container Apps for the backend

**Problem:** The FastAPI backend needs to be containerised and deployed to Azure Container Apps (which supports Docker containers and handles scaling).

**Plan:**
- Create an Azure Container Registry (ACR) to store the backend Docker image.
- Create an Azure DevOps pipeline that:
  1. Builds the backend Docker image.
  2. Pushes it to ACR.
  3. Deploys it to a Container App.
- Configure the Container App with all environment variables from Issue 4.
- Note the public URL of the Container App — this becomes `VITE_API_BASE_URL` for Issue 2.

**Done when:** `https://<your-container-app>.azurecontainerapps.io/stamps` returns data.

---

## Issue 7: Deploy the frontend to Azure Static Web Apps

**Problem:** The React frontend needs to be built and hosted publicly.

**Plan:**
- Create an Azure Static Web App linked to the Azure DevOps repo.
- Configure the build settings: app location `frontend`, build command `npm run build`, output location `dist`.
- Set the `VITE_API_BASE_URL` environment variable to the Container Apps URL from Issue 6.
- Update CORS in `backend/main.py` to allow the Static Web Apps domain.

**Done when:** The frontend loads at the Azure Static Web Apps URL and can reach the API.

---

---

## Feature: Tag editing on the Edit Stamp page

**Problem:** The Edit Stamp page currently has no way to view or edit a stamp's tags. Tags exist in the data model but are invisible in the UI.

**Plan:**
- Add a tag editor to the Edit Stamp page that displays existing tags as removable chips.
- Allow the user to type a new tag and press Enter or a button to add it.
- Tags are stored as a string array in MongoDB — `handleChange` does not handle arrays, so a dedicated `handleTagAdd` / `handleTagRemove` function will be needed.
- The tags are already included in the `formData` sent to the PUT endpoint, so no backend changes are required.

**Done when:** Tags are visible on the Edit page, new tags can be added, existing tags can be removed, and changes are saved correctly.

---

---

## Feature: Tests

**Problem:** There are currently no automated tests. As the app grows and moves toward cloud hosting, untested changes become riskier.

**Plan:**

### Backend (Python/FastAPI)
- Use `pytest` and `httpx` (async test client) to test the API endpoints.
- Key tests:
  - `GET /stamps` returns a list, respects `country` filter and pagination
  - `GET /stamps/{country}/{scott_number}` returns the correct stamp
  - `PUT /stamps/{country}/{scott_number}` updates and returns the updated stamp
  - `GET /countries` returns a unique list of countries
  - Sort order is correct (by `print_year` then numeric `scott_number`)
- Use a separate test MongoDB database so tests don't touch real data.

### Frontend (React/TypeScript)
- Use `Vitest` (built into Vite) and `React Testing Library`.
- Key tests:
  - `CollectionView` renders stamp grid and country filter buttons
  - Selecting a country updates the URL param
  - `EditStampPage` loads stamp data and populates form fields correctly
  - Condition dropdown shows the saved value
  - Tags can be added and removed

### CI (Azure DevOps)
- Add a pipeline step that runs backend and frontend tests on every PR before merging to `master`.

**Done when:** `pytest` and `vitest` both pass in CI on every PR.

---

## Recommended order of work

1. Issue 1 — migrate images to R2 (unblocks everything else)
2. Issue 5 — migrate to MongoDB Atlas (unblocks cloud API)
3. Issue 2 — environment variable for API base URL
4. Issue 4 — move secrets to Azure config
5. Issue 6 — deploy backend to Container Apps
6. Issue 3 — production frontend build
7. Issue 7 — deploy frontend to Static Web Apps
