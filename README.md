# Philatelic Archive

A containerized microservices application for managing a large stamp collection.

## Architecture

- **Frontend**: React (TypeScript) with Vite, Tailwind CSS, TanStack Query, react-window
- **Backend**: FastAPI (Python) with Motor (async MongoDB driver)
- **Database**: MongoDB in Docker
- **Orchestration**: Docker Compose

## Setup

1. Ensure Docker and Docker Compose are installed.
2. Clone or navigate to the project directory.
3. Run `docker-compose up --build` to start all services.
4. Access the frontend at http://localhost:5173
5. API at http://localhost:8000

## Bulk Loading Stamps

Use the `/stamps/bulk` endpoint to insert many stamps at once.

Example script in Python:

```python
import requests

stamps = [...]  # list of stamp dicts
response = requests.post('http://localhost:8000/stamps/bulk', json=stamps)
```

## Cloud Image Storage (Cloudflare R2)

Stamp images are stored in **Cloudflare R2** (S3-compatible object storage).

**Management console:** https://dash.cloudflare.com → R2 Object Storage

### Required environment variables (in `.env`)

| Variable | Description |
|---|---|
| `R2_ENDPOINT_URL` | S3-compatible endpoint for your R2 bucket |
| `R2_ACCESS_KEY_ID` | R2 API access key ID |
| `R2_SECRET_ACCESS_KEY` | R2 API secret access key |
| `R2_BUCKET_NAME` | Name of your R2 bucket |
| `R2_PUBLIC_URL` | Public base URL for serving images (requires public access enabled on the bucket) |

### How it works

When you upload an image on the Edit Stamp page, the backend sends the file to R2 and returns a public URL. That URL is stored in the stamp's `image_url` field in MongoDB and used to display the image in the collection.

## Running Tests

### Frontend

Tests use [Vitest](https://vitest.dev/) and React Testing Library. Run them outside of Docker, directly on your machine.

```bash
cd frontend
npm test          # run all tests once
npm run test:watch  # re-run on file changes
```

Test files live in `frontend/src/test/`.

To run a single test file:

```bash
npm test src/test/EditStampPage.test.tsx
```

To run a single test by name (partial match):

```bash
npm test -- --reporter=verbose -t "adds a new tag"
```

### Backend

Tests use `pytest` with `httpx` as the async test client. *(Coming soon — see plan.md)*

```bash
cd backend
pytest
```

## Data Model

See AppSetup.md for the MongoDB schema.