# X Clone

X Clone is a full stack social application built with Next.js, Express, Socket.IO, and MongoDB. It includes posts, comments, follows, media uploads, realtime direct messages, optimistic updates, and load tests for the main HTTP and WebSocket paths.

[![CI](https://github.com/Mirza404/x-clone/actions/workflows/ci.yml/badge.svg)](https://github.com/Mirza404/x-clone/actions/workflows/ci.yml)

## Local setup

Use a current Node.js LTS release and a MongoDB database.

1. Copy `backend/.env.example` to `backend/.env`.
2. Copy `frontend/.env.example` to `frontend/.env`.
3. Set the same `BACKEND_JWT_SECRET` in both files.
4. Run `npm install` in the root, `backend`, and `frontend` directories.
5. Run `npm run dev` in `backend`.
6. Run `npm run dev` in `frontend`.
7. Open [http://localhost:3000](http://localhost:3000).

The frontend uses port `3000`. The backend uses port `3001`.

## Project guides

1. [Frontend](frontend/README.md) covers the application structure, data access, authentication, and common commands.
2. [Backend](backend/README.md) covers the API, database, authentication, media flow, and common commands.
3. [Realtime messaging](docs/realtime-messaging.md) follows messages through the frontend, Socket.IO server, and MongoDB.
4. [Architecture](docs/architecture.md) records the main boundaries and the reasons behind them.
5. [Load testing](load-test/k6/README.md) explains setup, scenarios, metrics, and cleanup.
6. [Messaging review](MESSAGING_FLOW_REVIEW.md) contains the detailed messaging audit.
7. [Load test results](frontend/load_testing_plan.md) contains the recorded capacity runs and observations.

## Checks

Run `npm run check` from the repository root to check formatting, linting, types, the frontend build, and tests.
