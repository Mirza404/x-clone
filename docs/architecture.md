# Architecture

## Runtime boundary

The application has two deployable services and one database.

The Next.js service owns rendering, NextAuth sessions, browser state, and the user interface. The Express service owns application rules, HTTP endpoints, media validation, and realtime events. MongoDB is shared by NextAuth and the backend data models.

Express and Socket.IO share one Node.js HTTP server. This keeps authentication, conversations, messages, and ordinary API actions in one process. It also means Socket.IO rooms and presence are local to that process. Deployment therefore uses one backend instance until a shared Socket.IO adapter is introduced.

## Authentication

NextAuth establishes the browser session. The frontend exchanges that session for a short lived backend JWT. HTTP requests send it as a bearer token. Socket.IO sends it in the connection authentication payload and obtains a fresh value on reconnect.

The frontend and backend must share `BACKEND_JWT_SECRET`. The backend also validates the configured issuer and audience.

## Data access

React Query owns remote state in the browser. List queries use pagination. Mutations update or invalidate the relevant cache entries. Direct messages use optimistic entries identified by a client generated id, which also gives the backend an idempotency key.

The backend keeps controllers focused on request handling and places reusable work in services. Mongoose models define application documents and indexes. The native MongoDB collection is used where NextAuth owns the user records.

## Media

The browser uploads directly to Cloudinary with a signature from the backend. The backend records the completed upload and verifies ownership when a post, comment, or message references the resulting URL. This keeps large files away from the application server without trusting arbitrary external URLs.

## Deployment

Docker Compose runs the two services locally. `render.yaml` defines the equivalent Render services. Automatic deployment is disabled. Secrets and database addresses remain environment values.

Capacity results and the current scaling constraints are recorded in the [load test results](../frontend/load_testing_plan.md).
