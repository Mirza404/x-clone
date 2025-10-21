# X Clone

Quick summary

- Backend: Express + TypeScript — see [backend/src/app.ts](backend/src/app.ts) and [backend/src/index.ts](backend/src/index.ts).
- Frontend: Next.js 14 (app dir) — see [frontend/src/app/layout.tsx](frontend/src/app/layout.tsx).
- Database: MongoDB (Atlas recommended). Backend connects via [`connectToDatabase`](backend/src/db/connection.ts).
- Client-side data layer: React Query (caching, infinite queries, mutations, optimistic updates).

Getting started (dev)

1. Copy env files:
   - Backend: copy [backend/.env.example](backend/.env.example) -> `backend/.env` and set your Atlas URL and secrets.
   - Frontend: copy [frontend/.env.example](frontend/.env.example) -> `frontend/.env`.
2. Start backend:
   - `cd backend`
   - `npm install`
   - `npm run dev`
   - backend listens on port 3001 by default ([backend/src/index.ts](backend/src/index.ts)).
3. Start frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev`
   - open http://localhost:3000

React Query — what I used and why

- Central provider: [`QueryProvider`](frontend/src/query-client-provider/index.tsx) creates a global QueryClient for caching and devtools.
- Fetches / pagination:
  - Infinite lists: [`postMutations`](frontend/src/app/utils/postMutations.ts) exposes `useFetchInfinitePosts` and `useFetchInfiniteComments` (infinite queries and page merging).
  - Generic fetch helpers live in [`frontend/src/app/utils/fetchInfo.ts`](frontend/src/app/utils/fetchInfo.ts).
- Mutations:
  - Post mutations (delete / update): [`postMutations`](frontend/src/app/utils/postMutations.ts).
  - Comment mutations: [`useCommentMutations`](frontend/src/app/utils/commentMutations.ts).
  - Liking with optimistic UI: [`LikeButton`](frontend/src/app/components/ui/LikeButton.tsx) uses a `useMutation` with onMutate/onError rollback for snappy UX.
- What React Query helped me with:
  - Automatic caching and cache invalidation (invalidateQueries/removeQueries).
  - Built-in infinite scroll support (getNextPageParam).
  - Easy optimistic updates and rollback.
  - Reduced boilerplate for request/retry/stale handling.

Could I have done the same without React Query?

- Probably, everything is possible with useState/useEffect and fetch/axios, but I'd have to reimplement caching, do pagination from scratch, retries, optimistic updates and global prefetch logic manually. React Query saves time and avoids subtle bugs and that makes it a great tool.

Useful backend/frontend files

- Backend entry & router: [backend/src/app.ts](backend/src/app.ts), [backend/src/index.ts](backend/src/index.ts)
- DB connection: [`connectToDatabase`](backend/src/db/connection.ts) — set your MongoDB Atlas URI in [backend/.env.example](backend/.env.example)
- API routes: [backend/src/routes/post-routes.ts](backend/src/routes/post-routes.ts), [backend/src/routes/comment-routes.ts](backend/src/routes/comment-routes.ts)
- Frontend layout & providers: [frontend/src/app/layout.tsx](frontend/src/app/layout.tsx), [`QueryProvider`](frontend/src/query-client-provider/index.tsx)
- React Query helpers: [`postMutations`](frontend/src/app/utils/postMutations.ts), [`useCommentMutations`](frontend/src/app/utils/commentMutations.ts)
- Fetch helpers: [frontend/src/app/utils/fetchInfo.ts](frontend/src/app/utils/fetchInfo.ts)
- UI that uses mutations/optimistic updates: [`LikeButton`](frontend/src/app/components/ui/LikeButton.tsx)

That's it — straightforward local setup and why React Query is used. If you want, I can add short docker-compose/dev Dockerfiles for local dev next.
