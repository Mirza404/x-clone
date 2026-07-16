import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import mongoose from 'mongoose';
import { Request, Response } from 'express';
import Post from '../models/Post';
import Comment from '../models/Comment';
import { deletePost } from './post-controller';

type MockResponse = Response & {
  statusCode?: number;
  body?: unknown;
};

const originalReadyStateDescriptor = Object.getOwnPropertyDescriptor(
  mongoose.connection,
  'readyState'
);
const originalFindById = Post.findById;
const originalDeleteOne = Post.deleteOne;
const originalDeleteMany = Comment.deleteMany;

function setReadyState(readyState: number) {
  Object.defineProperty(mongoose.connection, 'readyState', {
    configurable: true,
    get: () => readyState,
  });
}

function restoreReadyState() {
  if (originalReadyStateDescriptor) {
    Object.defineProperty(
      mongoose.connection,
      'readyState',
      originalReadyStateDescriptor
    );
  }
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

function createRequest(body: Record<string, unknown>): Request {
  return { body } as Request;
}

afterEach(() => {
  restoreReadyState();
  (Post as unknown as { findById: typeof originalFindById }).findById =
    originalFindById;
  (Post as unknown as { deleteOne: typeof originalDeleteOne }).deleteOne =
    originalDeleteOne;
  (Comment as unknown as { deleteMany: typeof originalDeleteMany }).deleteMany =
    originalDeleteMany;
});

test('deletePost returns 400 when id is missing', async () => {
  const response = createResponse();

  await deletePost(createRequest({}), response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { message: 'Post ID is required' });
});

test('deletePost returns 404 when the post does not exist', async () => {
  setReadyState(1);
  let deleteManyCalled = false;
  (Post as unknown as { findById: unknown }).findById = () => ({
    select: async () => null,
  });
  (Comment as unknown as { deleteMany: unknown }).deleteMany = async () => {
    deleteManyCalled = true;
  };
  const response = createResponse();

  await deletePost(
    createRequest({ id: new mongoose.Types.ObjectId() }),
    response
  );

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, { message: 'Post not found' });
  assert.equal(deleteManyCalled, false);
});

test('deletePost deletes comments for the post before deleting the post', async () => {
  setReadyState(1);
  const postId = new mongoose.Types.ObjectId();
  const calls: unknown[] = [];
  (Post as unknown as { findById: unknown }).findById = () => ({
    select: async () => ({ _id: postId }),
  });
  (Comment as unknown as { deleteMany: unknown }).deleteMany = async (
    query: unknown
  ) => {
    calls.push(['Comment.deleteMany', query]);
  };
  (Post as unknown as { deleteOne: unknown }).deleteOne = async (
    query: unknown
  ) => {
    calls.push(['Post.deleteOne', query]);
  };
  const response = createResponse();

  await deletePost(createRequest({ id: postId.toString() }), response);

  assert.deepEqual(calls, [
    ['Comment.deleteMany', { postId }],
    ['Post.deleteOne', { _id: postId }],
  ]);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { message: 'Post deleted successfully' });
});
