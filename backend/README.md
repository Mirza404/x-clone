# Backend

The backend is an Express and Socket.IO service written in TypeScript. MongoDB stores application data through Mongoose and the MongoDB driver.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URL`, `FRONTEND_URL`, Cloudinary credentials, and application secrets. For local development without an Atlas account, run `docker compose up -d mongo` from the repo root and point `MONGODB_URL` at it instead (see the commented example in `.env.example`).
3. Use the same `BACKEND_JWT_SECRET` as the frontend.
4. Run `npm install`.
5. Run `npm run dev`.

The server listens on port `3001`.

## Structure

`src/index.ts` creates one HTTP server for Express and Socket.IO. `src/app.ts` configures middleware and mounts the API at `/api`. Route modules delegate to controllers and services. Mongoose models define posts, comments, follows, likes, conversations, messages, media assets, and related indexes.

Likes are their own collection (`Like`, with a `targetType` discriminator for `post`/`comment`) rather than an array embedded on the post or comment, so toggling a like is a single atomic compare-and-swap against a unique index instead of a read-then-write race, and each target keeps a cached `likeCount` instead of the count being derived from an unbounded array. `npm run backfill:likes` migrates any pre-existing embedded `likes` arrays into the `Like` collection — run it once after deploying this schema, before relying on `likeCount`/`isLiked` being correct.

The HTTP API accepts bearer tokens minted by the frontend from a valid NextAuth session. Socket.IO accepts the same token in its connection authentication payload. Both paths verify issuer, audience, signature, and subject before attaching the user identity.

Media uploads use signed Cloudinary requests. The backend signs uploads, records completed assets, and checks ownership before an asset URL can be attached to content.

## Commands

1. `npm run dev` starts the development server.
2. `npm run build` compiles the production server.
3. `npm run lint` runs ESLint.
4. `npm run typecheck` runs TypeScript without emitting files.
5. `npm test` runs the backend tests.
6. `npm run seed` creates local sample data.
7. `npm run backfill:likes` migrates pre-existing embedded `likes` arrays into the `Like` collection (one-off, safe to re-run).

Load test accounts have separate seed and cleanup commands. See the [load testing guide](../load-test/k6/README.md) before using them.
