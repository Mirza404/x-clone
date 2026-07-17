import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import mongoose from 'mongoose';
import { Request, Response } from 'express';
import Post from '../models/Post';
import Comment from '../models/Comment';
import { deleteComment, toggleLike } from './comment-controller';

type MockResponse = Response & {
  statusCode?: number;
  body?: unknown;
};

const originalReadyStateDescriptor = Object.getOwnPropertyDescriptor(
  mongoose.connection,
  'readyState'
);
const originalCommentFindById = Comment.findById;
const originalCommentFindByIdAndUpdate = Comment.findByIdAndUpdate;
const originalCommentDeleteMany = Comment.deleteMany;
const originalPostFindByIdAndUpdate = Post.findByIdAndUpdate;

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

function createRequest(options: {
  params?: Record<string, unknown>;
  body?: Record<string, unknown>;
}): Request {
  return { params: options.params ?? {}, body: options.body ?? {} } as Request;
}

afterEach(() => {
  restoreReadyState();
  (
    Comment as unknown as { findById: typeof originalCommentFindById }
  ).findById = originalCommentFindById;
  (
    Comment as unknown as {
      findByIdAndUpdate: typeof originalCommentFindByIdAndUpdate;
    }
  ).findByIdAndUpdate = originalCommentFindByIdAndUpdate;
  (
    Comment as unknown as { deleteMany: typeof originalCommentDeleteMany }
  ).deleteMany = originalCommentDeleteMany;
  (
    Post as unknown as {
      findByIdAndUpdate: typeof originalPostFindByIdAndUpdate;
    }
  ).findByIdAndUpdate = originalPostFindByIdAndUpdate;
});

test('deleteComment returns 400 when commentId is missing', async () => {
  const response = createResponse();

  await deleteComment(createRequest({}), response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { message: 'Comment ID is required' });
});

test('deleteComment returns 404 when the comment does not exist', async () => {
  setReadyState(1);
  (Comment as unknown as { findById: unknown }).findById = async () => null;
  const response = createResponse();

  await deleteComment(
    createRequest({ params: { commentId: new mongoose.Types.ObjectId() } }),
    response
  );

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, { message: 'Comment not found' });
});

test('deleteComment removes a top-level comment and its replies, and unlinks it from the post', async () => {
  setReadyState(1);
  const postId = new mongoose.Types.ObjectId();
  const commentId = new mongoose.Types.ObjectId();
  const replyId = new mongoose.Types.ObjectId();
  const calls: unknown[] = [];

  (Comment as unknown as { findById: unknown }).findById = async () => ({
    _id: commentId,
    postId,
    parentComment: null,
    replies: [replyId],
  });
  (Post as unknown as { findByIdAndUpdate: unknown }).findByIdAndUpdate =
    async (id: unknown, update: unknown) => {
      calls.push(['Post.findByIdAndUpdate', id, update]);
    };
  (Comment as unknown as { deleteMany: unknown }).deleteMany = async (
    query: unknown
  ) => {
    calls.push(['Comment.deleteMany', query]);
  };

  const response = createResponse();

  await deleteComment(
    createRequest({ params: { commentId: commentId.toString() } }),
    response
  );

  assert.deepEqual(calls, [
    ['Post.findByIdAndUpdate', postId, { $pull: { comments: commentId } }],
    ['Comment.deleteMany', { _id: { $in: [commentId, replyId] } }],
  ]);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { message: 'Comment deleted successfully' });
});

test('deleteComment removes a reply and pulls it from its parent instead of the post', async () => {
  setReadyState(1);
  const parentCommentId = new mongoose.Types.ObjectId();
  const commentId = new mongoose.Types.ObjectId();
  const calls: unknown[] = [];

  (Comment as unknown as { findById: unknown }).findById = async () => ({
    _id: commentId,
    postId: new mongoose.Types.ObjectId(),
    parentComment: parentCommentId,
    replies: [],
  });
  (Comment as unknown as { findByIdAndUpdate: unknown }).findByIdAndUpdate =
    async (id: unknown, update: unknown) => {
      calls.push(['Comment.findByIdAndUpdate', id, update]);
    };
  (Comment as unknown as { deleteMany: unknown }).deleteMany = async (
    query: unknown
  ) => {
    calls.push(['Comment.deleteMany', query]);
  };

  const response = createResponse();

  await deleteComment(
    createRequest({ params: { commentId: commentId.toString() } }),
    response
  );

  assert.deepEqual(calls, [
    [
      'Comment.findByIdAndUpdate',
      parentCommentId,
      { $pull: { replies: commentId } },
    ],
    ['Comment.deleteMany', { _id: { $in: [commentId] } }],
  ]);
  assert.equal(response.statusCode, 200);
});

test('toggleLike adds the author when a string authorId matches an ObjectId already stored in likes', async () => {
  setReadyState(1);
  const commentId = new mongoose.Types.ObjectId();
  const authorObjectId = new mongoose.Types.ObjectId();
  const calls: unknown[] = [];

  (Comment as unknown as { findById: unknown }).findById = async () => ({
    likes: [authorObjectId],
  });
  (Comment as unknown as { findByIdAndUpdate: unknown }).findByIdAndUpdate =
    async (id: unknown, update: unknown) => {
      calls.push(update);
    };

  const response = createResponse();

  // authorId arrives from the client as a string, likes are stored as ObjectIds.
  await toggleLike(
    createRequest({
      body: { id: commentId.toString(), authorId: authorObjectId.toString() },
    }),
    response
  );

  assert.deepEqual(calls, [{ $pull: { likes: authorObjectId } }]);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { message: 'Comment unliked' });
});

test('toggleLike likes the comment when the author has not liked it yet', async () => {
  setReadyState(1);
  const commentId = new mongoose.Types.ObjectId();
  const authorId = new mongoose.Types.ObjectId().toString();
  const calls: unknown[] = [];

  (Comment as unknown as { findById: unknown }).findById = async () => ({
    likes: [],
  });
  (Comment as unknown as { findByIdAndUpdate: unknown }).findByIdAndUpdate =
    async (id: unknown, update: unknown) => {
      calls.push(update);
    };

  const response = createResponse();

  await toggleLike(
    createRequest({ body: { id: commentId.toString(), authorId } }),
    response
  );

  assert.equal(calls.length, 1);
  assert.deepEqual(response.body, { message: 'Comment liked' });
});
