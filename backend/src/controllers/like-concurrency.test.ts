import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import mongoose from 'mongoose';
import { Request, Response } from 'express';
import Post from '../models/Post';
import Like from '../models/Like';
import { toggleLike } from './post-controller';

// Every other test in this suite mocks Mongoose model statics directly and
// never touches a real database — mocks can prove the code CALLS the right
// operations, but they can't prove those operations are actually atomic
// under real concurrent access. This file is the one exception: it connects
// to a real MongoDB (the `mongo` service in docker-compose.yml, or any local
// instance) and fires genuinely concurrent requests at it, so the assertions
// below exercise Mongo's real atomic guarantees instead of a mock's.
//
// If no MongoDB is reachable, every test here skips (not fails) so `npm
// test` still passes on a machine that hasn't started the `mongo` service.
const MONGODB_URL =
  process.env.MONGODB_URL ??
  'mongodb://localhost:27017/xclone-like-concurrency-test';

let mongoAvailable = false;

type MockResponse = Response & { statusCode?: number; body?: unknown };

function createResponse(): MockResponse {
  const response: MockResponse = {
    headersSent: false,
    status(this: MockResponse, code: number) {
      this.statusCode = code;
      return this;
    },
    json(this: MockResponse, body: unknown) {
      this.body = body;
      return this;
    },
  } as MockResponse;
  return response;
}

function createToggleRequest(postId: string, userId: string): Request {
  return { body: { id: postId }, userId } as Request;
}

before(async () => {
  try {
    await mongoose.connect(MONGODB_URL, { serverSelectionTimeoutMS: 2000 });
    mongoAvailable = true;
  } catch {
    mongoAvailable = false;
  }
});

after(async () => {
  if (mongoAvailable) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

const SKIP_MESSAGE =
  'No local MongoDB reachable — start it with `docker compose up -d mongo` (see docker-compose.yml), or set MONGODB_URL, then re-run.';

test('toggleLike never duplicates or drifts under concurrent toggles from the same user', async (t) => {
  if (!mongoAvailable) {
    t.skip(SKIP_MESSAGE);
    return;
  }

  const post = await Post.create({
    content: 'concurrency test post',
    author: new mongoose.Types.ObjectId(),
    name: 'Test Author',
  });
  const userId = new mongoose.Types.ObjectId().toString();
  const postId = post._id.toString();

  // Fired concurrently, not sequentially — the same request the old
  // check-then-act code raced on. Which final state (liked/unliked) wins
  // depends on real interleaving order and isn't predictable, but the
  // invariants below always must hold regardless of that order.
  const CONCURRENT_TOGGLES = 20;
  await Promise.all(
    Array.from({ length: CONCURRENT_TOGGLES }, () =>
      toggleLike(createToggleRequest(postId, userId), createResponse())
    )
  );

  const likeDocsForUser = await Like.countDocuments({
    user: userId,
    targetType: 'post',
    targetId: post._id,
  });
  assert.ok(
    likeDocsForUser === 0 || likeDocsForUser === 1,
    `expected 0 or 1 Like documents for this user, got ${likeDocsForUser} (duplicate toggle)`
  );

  const totalLikeDocs = await Like.countDocuments({
    targetType: 'post',
    targetId: post._id,
  });
  const updatedPost = await Post.findById(post._id).lean();
  assert.equal(
    updatedPost?.likeCount,
    totalLikeDocs,
    'Post.likeCount drifted from the actual number of Like documents'
  );
});

test('toggleLike keeps likeCount exact under concurrent likes from different users', async (t) => {
  if (!mongoAvailable) {
    t.skip(SKIP_MESSAGE);
    return;
  }

  const post = await Post.create({
    content: 'concurrency test post 2',
    author: new mongoose.Types.ObjectId(),
    name: 'Test Author',
  });
  const postId = post._id.toString();

  const CONCURRENT_LIKERS = 20;
  const userIds = Array.from({ length: CONCURRENT_LIKERS }, () =>
    new mongoose.Types.ObjectId().toString()
  );

  // Each user is liking for the first time, so unlike the same-user test
  // above this has one unambiguous correct outcome: every like should land.
  await Promise.all(
    userIds.map((userId) =>
      toggleLike(createToggleRequest(postId, userId), createResponse())
    )
  );

  const totalLikeDocs = await Like.countDocuments({
    targetType: 'post',
    targetId: post._id,
  });
  assert.equal(
    totalLikeDocs,
    CONCURRENT_LIKERS,
    'expected every concurrent first-time like to be recorded exactly once'
  );

  const updatedPost = await Post.findById(post._id).lean();
  assert.equal(
    updatedPost?.likeCount,
    CONCURRENT_LIKERS,
    'Post.likeCount lost increments under concurrent writes'
  );
});
