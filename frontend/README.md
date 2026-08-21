# Frontend

The frontend is a Next.js application using React, NextAuth, React Query, Tailwind CSS, and Socket.IO Client.

## Setup

1. Copy `.env.example` to `.env`.
2. Configure Google OAuth, MongoDB, Cloudinary, and `NEXT_PUBLIC_SERVER_URL`.
3. Use the same `BACKEND_JWT_SECRET` as the backend.
4. Run `npm install`.
5. Run `npm run dev` and open [http://localhost:3000](http://localhost:3000).

## Structure

Routes and layouts live in `src/app`. Shared interface components live in `src/app/components`. Server access functions live in `src/app/utils`. React Query hooks live in `src/app/hooks` and mutation modules in `src/app/utils`.

The root layout installs the session, query, socket, theme, and post modal providers. HTTP requests obtain a short lived backend token from the current NextAuth session. Realtime messaging uses the same identity through the Socket.IO authentication payload.

Posts and comments use React Query for pagination, cache invalidation, and optimistic changes. Messaging keeps the conversation list and message pages in the same query cache so socket events can update every visible surface consistently.

## Commands

1. `npm run dev` starts the development server.
2. `npm run build` creates a production build.
3. `npm run lint` runs ESLint.
4. `npm run typecheck` runs TypeScript without emitting files.
5. `npm test` runs Jest.

See [realtime messaging](../docs/realtime-messaging.md) for the socket flow and [architecture](../docs/architecture.md) for system boundaries.
