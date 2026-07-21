import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import mongoose from 'mongoose';
import { Request, Response } from 'express';
import Post from '../models/Post';
import Follow from '../models/Follow';
import { getProfile, toggleFollow } from './user-controller';

type MockResponse = Response & {
  statusCode?: number;
  body?: unknown;
};

const originalReadyStateDescriptor = Object.getOwnPropertyDescriptor(
  mongoose.connection,
  'readyState'
);
const originalDb = Object.getOwnPropertyDescriptor(mongoose.connection, 'db');
const originalPostCountDocuments = Post.countDocuments;
const originalFollowCountDocuments = Follow.countDocuments;
const originalFollowExists = Follow.exists;
const originalFollowFindOne = Follow.findOne;
const originalFollowDeleteOne = Follow.deleteOne;
const originalFollowCreate = Follow.create;

function setReadyState(readyState: number) {
  Object.defineProperty(mongoose.connection, 'readyState', {
    configurable: true,
    get: () => readyState,
  });
}

function setUsersCollection(user: Record<string, unknown> | null) {
  Object.defineProperty(mongoose.connection, 'db', {
    configurable: true,
    get: () => ({
      collection: () => ({
        findOne: async () => user,
      }),
    }),
  });
}

function restoreMocks() {
  if (originalReadyStateDescriptor) {
    Object.defineProperty(
      mongoose.connection,
      'readyState',
      originalReadyStateDescriptor
    );
  }
  if (originalDb) {
    Object.defineProperty(mongoose.connection, 'db', originalDb);
  }
  (
    Post as unknown as { countDocuments: typeof originalPostCountDocuments }
  ).countDocuments = originalPostCountDocuments;
  (
    Follow as unknown as {
      countDocuments: typeof originalFollowCountDocuments;
    }
  ).countDocuments = originalFollowCountDocuments;
  (Follow as unknown as { exists: typeof originalFollowExists }).exists =
    originalFollowExists;
  (Follow as unknown as { findOne: typeof originalFollowFindOne }).findOne =
    originalFollowFindOne;
  (
    Follow as unknown as { deleteOne: typeof originalFollowDeleteOne }
  ).deleteOne = originalFollowDeleteOne;
  (Follow as unknown as { create: typeof originalFollowCreate }).create =
    originalFollowCreate;
}

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

function createRequest(options: {
  params?: Record<string, unknown>;
  body?: Record<string, unknown>;
  userId?: string;
}): Request {
  return {
    params: options.params ?? {},
    body: options.body ?? {},
    userId: options.userId,
  } as unknown as Request;
}

afterEach(() => {
  restoreMocks();
});

const VALID_ID = '507f1f77bcf86cd799439011';
const OTHER_ID = '507f1f77bcf86cd799439012';

test('getProfile returns 400 when id is not a valid ObjectId', async () => {
  const response = createResponse();

  await getProfile(createRequest({ params: { id: 'not-an-id' } }), response);

  assert.equal(response.statusCode, 400);
});

test('getProfile returns 404 when user does not exist', async () => {
  setReadyState(1);
  setUsersCollection(null);
  const response = createResponse();

  await getProfile(createRequest({ params: { id: VALID_ID } }), response);

  assert.equal(response.statusCode, 404);
});

test('getProfile returns profile data with counts and follow state', async () => {
  setReadyState(1);
  setUsersCollection({ _id: VALID_ID, name: 'Ada', image: 'ada.png' });
  (
    Post as unknown as { countDocuments: () => Promise<number> }
  ).countDocuments = async () => 3;
  (
    Follow as unknown as { countDocuments: () => Promise<number> }
  ).countDocuments = async () => 5;
  (Follow as unknown as { exists: () => Promise<boolean> }).exists = async () =>
    true;
  const response = createResponse();

  await getProfile(
    createRequest({ params: { id: VALID_ID }, userId: OTHER_ID }),
    response
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    id: VALID_ID,
    name: 'Ada',
    image: 'ada.png',
    postCount: 3,
    followersCount: 5,
    followingCount: 5,
    isFollowing: true,
    isSelf: false,
  });
});

test('toggleFollow returns 401 when unauthenticated', async () => {
  const response = createResponse();

  await toggleFollow(createRequest({ body: { userId: VALID_ID } }), response);

  assert.equal(response.statusCode, 401);
});

test('toggleFollow returns 400 when following self', async () => {
  const response = createResponse();

  await toggleFollow(
    createRequest({ body: { userId: VALID_ID }, userId: VALID_ID }),
    response
  );

  assert.equal(response.statusCode, 400);
});

test('toggleFollow creates a follow when none exists', async () => {
  setReadyState(1);
  setUsersCollection({ _id: OTHER_ID });
  (Follow as unknown as { findOne: () => Promise<null> }).findOne = async () =>
    null;
  let created: unknown = null;
  (Follow as unknown as { create: (doc: unknown) => Promise<unknown> }).create =
    async (doc: unknown) => {
      created = doc;
      return doc;
    };
  const response = createResponse();

  await toggleFollow(
    createRequest({ body: { userId: OTHER_ID }, userId: VALID_ID }),
    response
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { following: true });
  assert.ok(created);
});

test('toggleFollow removes an existing follow (unfollow)', async () => {
  setReadyState(1);
  setUsersCollection({ _id: OTHER_ID });
  (Follow as unknown as { findOne: () => Promise<{ _id: string }> }).findOne =
    async () => ({ _id: 'follow-doc-id' });
  let deletedId: unknown = null;
  (
    Follow as unknown as {
      deleteOne: (filter: { _id: unknown }) => Promise<unknown>;
    }
  ).deleteOne = async (filter: { _id: unknown }) => {
    deletedId = filter._id;
    return { deletedCount: 1 };
  };
  const response = createResponse();

  await toggleFollow(
    createRequest({ body: { userId: OTHER_ID }, userId: VALID_ID }),
    response
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { following: false });
  assert.equal(deletedId, 'follow-doc-id');
});
