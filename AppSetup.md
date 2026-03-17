Project Specification: Philatelic Archive (20,000+ Items)
1. High-Level Architecture (Containerized)
This application uses a Dockerized Microservices approach to ensure data persistence and environment consistency.

Frontend: React (TypeScript) via Vite.

Backend: Python FastAPI (Asynchronous).

Database: MongoDB (Local Docker Container).

Orchestration: Docker Compose.

2. Data Model (MongoDB Schema)
JSON

{
  "name": "String",           // e.g., "Inverted Jenny"
  "scott_number": "String",    // Primary identifier
  "country": "String",         // Origin country
  "denomination": "String",    // Face value
  "print_date": "ISODate",     // Release/print date
  "color": "String",           // Physical color
  "dimensions": "String",      // e.g., "22mm x 25mm"
  "condition": "Enum",         // [Used, Unused, Mint, FDC, Block, Coil]
  "value": "Number",           // Market value (float)
  "image_url": "String",       // Local path or CDN link
  "tags": ["Array of Strings"] // e.g., ["Airmail", "Error"]
}
3. Docker & Persistence Requirements
To handle 20,000+ records and images safely, the following Docker configurations are required:

A. Database Persistence
Volume Mounting: The MongoDB container MUST map /data/db to a local named volume (e.g., stamp_db_data) to prevent data loss when containers are removed.

Connection: The Backend connects to the database using the service name mongodb:27017 instead of localhost.

B. Image Storage Strategy
Local Image Volume: Since the collection is large, mount a local host directory containing the stamp scans (e.g., ./stamps_library) to the FastAPI container at /app/images.

Static Serving: FastAPI will serve these images as static files so the React frontend can access them via http://localhost:8000/images/filename.jpg.

4. Performance Standards
Indexing: MongoDB must have a unique index on scott_number.

Pagination: The API must default to a 50-item limit per request.

Frontend Virtualization: Use react-window to render the grid, ensuring only stamps in the viewport are processed by the browser.

5. Dev Stack for AI Reference
Backend: FastAPI, motor (async driver), pydantic.

Frontend: Vite, React, Tailwind CSS, TanStack Query (React Query).

Container: docker-compose.yml orchestrating three services (web, api, db).

AI Implementation Notes
Beginner Friendly: I am learning Python; please provide clear comments on Dockerfile commands and FastAPI route logic.

Strict Isolation: Keep the DnD/Tower project context separate from this Philatelic Archive.

Bulk Loading: When generating scripts to import my 20,000 stamps, use insert_many for efficiency.