import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import mongoose from 'mongoose';
import { Request, Response } from 'express';
import Post from '../models/Post';
import Comment from '../models/Comment';
import {
  deleteComment,
  toggleLike,
  allComments,
  findCommentsByPost,
  findCommentById,
  createComment,
  updateComment,
  getLikes,
} from './comment-controller';

type MockResponse = Response & {
  statusCode?: number;
  body?: unknown;
};

const originalReadyStateDescriptor = Object.getOwnPropertyDescriptor(
  mongoose.connection,
  'readyState'
);
const originalDbDescriptor = Object.getOwnPropertyDescriptor(
  mongoose.connection,
  'db'
);
const originalCommentFindById = Comment.findById;
const originalCommentFindByIdAndUpdate = Comment.findByIdAndUpdate;
const originalCommentDeleteMany = Comment.deleteMany;
const originalCommentFind = Comment.find;
const originalCommentFindOne = Comment.findOne;
const originalCommentCountDocuments = Comment.countDocuments;
const originalCommentSave = Comment.prototype.save;
const originalPostFindByIdAndUpdate = Post.findByIdAndUpdate;
const originalPostFindById = Post.findById;

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

function setUsersCollection(
  users: Array<Record<string, unknown>>,
  findOneResult: Record<string, unknown> | null = null
) {
  Object.defineProperty(mongoose.connection, 'db', {
    configurable: true,
    get: () => ({
      collection: () => ({
        find: () => ({
          project: () => ({
            toArray: async () => users,
          }),
        }),
        findOne: async () => findOneResult,
      }),
    }),
  });
}

function restoreDb() {
  if (originalDbDescriptor) {
    Object.defineProperty(mongoose.connection, 'db', originalDbDescriptor);
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
  query?: Record<string, unknown>;
  userId?: string;
}): Request {
  return {
    params: options.params ?? {},
    body: options.body ?? {},
    query: options.query ?? {},
    userId: options.userId,
  } as Request;
}

afterEach(() => {
  restoreReadyState();
  restoreDb();
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
  (Comment as unknown as { find: typeof originalCommentFind }).find =
    originalCommentFind;
  (Comment as unknown as { findOne: typeof originalCommentFindOne }).findOne =
    originalCommentFindOne;
  (
    Comment as unknown as {
      countDocuments: typeof originalCommentCountDocuments;
    }
  ).countDocuments = originalCommentCountDocuments;
  Comment.prototype.save = originalCommentSave;
  (
    Post as unknown as {
      findByIdAndUpdate: typeof originalPostFindByIdAndUpdate;
    }
  ).findByIdAndUpdate = originalPostFindByIdAndUpdate;
  (Post as unknown as { findById: typeof originalPostFindById }).findById =
    originalPostFindById;
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
  const authorId = new mongoose.Types.ObjectId();
  const calls: unknown[] = [];

  (Comment as unknown as { findById: unknown }).findById = async () => ({
    _id: commentId,
    postId,
    author: authorId,
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
    createRequest({
      params: { commentId: commentId.toString() },
      userId: authorId.toString(),
    }),
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
  const authorId = new mongoose.Types.ObjectId();
  const calls: unknown[] = [];

  (Comment as unknown as { findById: unknown }).findById = async () => ({
    _id: commentId,
    postId: new mongoose.Types.ObjectId(),
    author: authorId,
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
    createRequest({
      params: { commentId: commentId.toString() },
      userId: authorId.toString(),
    }),
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

test('deleteComment returns 403 when the caller does not own the comment', async () => {
  setReadyState(1);
  const commentId = new mongoose.Types.ObjectId();
  const authorId = new mongoose.Types.ObjectId();
  const otherUserId = new mongoose.Types.ObjectId().toString();
  let deleteManyCalled = false;

  (Comment as unknown as { findById: unknown }).findById = async () => ({
    _id: commentId,
    postId: new mongoose.Types.ObjectId(),
    author: authorId,
    parentComment: null,
    replies: [],
  });
  (Comment as unknown as { deleteMany: unknown }).deleteMany = async () => {
    deleteManyCalled = true;
  };

  const response = createResponse();

  await deleteComment(
    createRequest({
      params: { commentId: commentId.toString() },
      userId: otherUserId,
    }),
    response
  );

  assert.equal(response.statusCode, 403);
  assert.equal(deleteManyCalled, false);
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

  // req.userId arrives as a string from the verified token, likes are stored as ObjectIds.
  await toggleLike(
    createRequest({
      body: { id: commentId.toString() },
      userId: authorObjectId.toString(),
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
    createRequest({ body: { id: commentId.toString() }, userId: authorId }),
    response
  );

  assert.equal(calls.length, 1);
  assert.deepEqual(response.body, { message: 'Comment liked' });
});

function mockCommentFind(comments: unknown[]) {
  (Comment as unknown as { find: (filter: unknown) => unknown }).find = () => ({
    sort: () => ({
      skip: () => ({
        limit: () => ({
          populate: () => ({
            lean: async () => comments,
          }),
        }),
      }),
    }),
  });
}

function mockPostFindByIdSelect(post: unknown) {
  (Post as unknown as { findById: (id: unknown) => unknown }).findById =
    () => ({
      select: () => ({
        lean: async () => post,
      }),
    });
}

test('allComments returns 500 when the database is not connected', async () => {
  setReadyState(0);
  const response = createResponse();

  await allComments(createRequest({}), response);

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, { message: 'Database not connected' });
});

test('allComments returns comments with author images and pagination info', async () => {
  setReadyState(1);
  const authorId = new mongoose.Types.ObjectId();
  const commentId = new mongoose.Types.ObjectId();
  const postId = new mongoose.Types.ObjectId();
  const createdAt = new Date();

  mockCommentFind([
    {
      _id: commentId,
      content: 'hello',
      name: 'Ada',
      postId,
      parentComment: null,
      createdAt,
      likes: [],
      author: authorId,
      replies: [],
    },
  ]);
  setUsersCollection([{ _id: authorId, image: 'ada.png' }]);
  (
    Comment as unknown as { countDocuments: () => Promise<number> }
  ).countDocuments = async () => 1;

  const response = createResponse();
  await allComments(
    createRequest({ query: { limit: '10', page: '1' } }),
    response
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    comments: [
      {
        id: commentId,
        content: 'hello',
        name: 'Ada',
        postId,
        parentComment: null,
        createdAt,
        likes: [],
        author: authorId,
        authorImage: 'ada.png',
        replies: [],
      },
    ],
    totalPages: 1,
    currentPage: 1,
  });
});

test('findCommentsByPost returns 400 when postId is missing', async () => {
  const response = createResponse();

  await findCommentsByPost(createRequest({ params: {} }), response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { message: 'Post ID is required' });
});

test('findCommentsByPost returns 500 when the database is not connected', async () => {
  setReadyState(0);
  const response = createResponse();

  await findCommentsByPost(
    createRequest({
      params: { postId: new mongoose.Types.ObjectId().toString() },
    }),
    response
  );

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, { message: 'Database not connected' });
});

test('findCommentsByPost returns 404 when the post does not exist', async () => {
  setReadyState(1);
  mockPostFindByIdSelect(null);
  const response = createResponse();

  await findCommentsByPost(
    createRequest({
      params: { postId: new mongoose.Types.ObjectId().toString() },
    }),
    response
  );

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, { message: 'Post not found' });
});

test('findCommentsByPost returns top-level comments with author images', async () => {
  setReadyState(1);
  const authorId = new mongoose.Types.ObjectId();
  const commentId = new mongoose.Types.ObjectId();
  const postId = new mongoose.Types.ObjectId();
  const createdAt = new Date();

  mockPostFindByIdSelect({ _id: postId, comments: [commentId] });
  mockCommentFind([
    {
      _id: commentId,
      content: 'hi',
      name: 'Ada',
      postId,
      parentComment: null,
      createdAt,
      likes: [],
      author: authorId,
      replies: [],
    },
  ]);
  setUsersCollection([{ _id: authorId, image: 'ada.png' }]);
  (
    Comment as unknown as { countDocuments: () => Promise<number> }
  ).countDocuments = async () => 1;

  const response = createResponse();
  await findCommentsByPost(
    createRequest({ params: { postId: postId.toString() } }),
    response
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    comments: [
      {
        id: commentId,
        content: 'hi',
        name: 'Ada',
        postId,
        parentComment: null,
        createdAt,
        likes: [],
        author: authorId,
        authorImage: 'ada.png',
        replies: [],
      },
    ],
    page: 1,
    limit: 10,
    totalComments: 1,
    totalPages: 1,
  });
});

test('findCommentById returns 400 when commentId is missing', async () => {
  const response = createResponse();

  await findCommentById(createRequest({ params: {} }), response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { message: 'Comment ID is required' });
});

test('findCommentById returns 404 when the post does not exist', async () => {
  setReadyState(1);
  mockPostFindByIdSelect(null);
  const response = createResponse();

  await findCommentById(
    createRequest({
      params: {
        postId: new mongoose.Types.ObjectId().toString(),
        commentId: new mongoose.Types.ObjectId().toString(),
      },
    }),
    response
  );

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, { message: 'Post not found' });
});

test('findCommentById returns 404 when the comment cannot be found as top-level or reply', async () => {
  setReadyState(1);
  mockPostFindByIdSelect({ _id: new mongoose.Types.ObjectId(), comments: [] });
  (Comment as unknown as { findOne: unknown }).findOne = () => ({
    populate: () => ({
      lean: async () => null,
    }),
  });
  const response = createResponse();

  await findCommentById(
    createRequest({
      params: {
        postId: new mongoose.Types.ObjectId().toString(),
        commentId: new mongoose.Types.ObjectId().toString(),
      },
    }),
    response
  );

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, { message: 'Comment not found' });
});

test('findCommentById returns the comment with author images when found as top-level', async () => {
  setReadyState(1);
  const authorId = new mongoose.Types.ObjectId();
  const commentId = new mongoose.Types.ObjectId();
  const postId = new mongoose.Types.ObjectId();
  const createdAt = new Date();

  mockPostFindByIdSelect({ _id: postId, comments: [commentId] });
  (Comment as unknown as { findOne: unknown }).findOne = () => ({
    populate: () => ({
      lean: async () => ({
        _id: commentId,
        content: 'hi',
        name: 'Ada',
        postId,
        parentComment: null,
        createdAt,
        likes: [],
        author: authorId,
        replies: [],
      }),
    }),
  });
  setUsersCollection([{ _id: authorId, image: 'ada.png' }]);

  const response = createResponse();
  await findCommentById(
    createRequest({
      params: { postId: postId.toString(), commentId: commentId.toString() },
    }),
    response
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, [
    {
      id: commentId,
      content: 'hi',
      name: 'Ada',
      postId,
      parentComment: null,
      createdAt,
      likes: [],
      author: authorId,
      authorImage: 'ada.png',
      replies: [],
    },
  ]);
});

test('createComment returns 400 when required fields are missing', async () => {
  const response = createResponse();

  await createComment(createRequest({ params: {}, body: {} }), response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    message: 'Post ID and content are required',
  });
});

test('createComment creates a top-level comment and pushes it onto the post', async () => {
  const postId = new mongoose.Types.ObjectId().toString();
  const authorId = new mongoose.Types.ObjectId().toString();
  const calls: unknown[] = [];

  setUsersCollection([], { name: 'Ada' });
  Comment.prototype.save = async function mockSave(this: unknown) {
    return this;
  };
  (Post as unknown as { findByIdAndUpdate: unknown }).findByIdAndUpdate =
    async (id: unknown, update: unknown) => {
      calls.push(['Post.findByIdAndUpdate', id, update]);
    };

  const response = createResponse();
  await createComment(
    createRequest({
      params: { postId },
      body: { content: 'hello' },
      userId: authorId,
    }),
    response
  );

  assert.equal(response.statusCode, 201);
  assert.equal(calls.length, 1);
  assert.equal((calls[0] as unknown[])[0], 'Post.findByIdAndUpdate');
});

test('createComment creates a reply and pushes it onto the parent comment', async () => {
  const postId = new mongoose.Types.ObjectId().toString();
  const authorId = new mongoose.Types.ObjectId().toString();
  const parentCommentId = new mongoose.Types.ObjectId().toString();
  const calls: unknown[] = [];

  setUsersCollection([], { name: 'Ada' });
  Comment.prototype.save = async function mockSave(this: unknown) {
    return this;
  };
  (Comment as unknown as { findByIdAndUpdate: unknown }).findByIdAndUpdate =
    async (id: unknown, update: unknown) => {
      calls.push(['Comment.findByIdAndUpdate', id, update]);
    };

  const response = createResponse();
  await createComment(
    createRequest({
      params: { postId },
      body: { content: 'a reply', parentCommentId },
      userId: authorId,
    }),
    response
  );

  assert.equal(response.statusCode, 201);
  assert.deepEqual(
    (response.body as { message: string }).message,
    'Reply added successfully'
  );
  assert.equal(calls.length, 1);
  assert.equal((calls[0] as unknown[])[0], 'Comment.findByIdAndUpdate');
});

test('createComment returns 500 when an unexpected error is thrown', async () => {
  const postId = new mongoose.Types.ObjectId().toString();
  const authorId = new mongoose.Types.ObjectId().toString();

  setUsersCollection([], null);

  const response = createResponse();
  await createComment(
    createRequest({
      params: { postId },
      body: { content: 'hello' },
      userId: authorId,
    }),
    response
  );

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, { message: 'Internal server error' });
});

test('updateComment returns 400 when required fields are missing', async () => {
  const response = createResponse();

  await updateComment(createRequest({ params: {}, body: {} }), response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    message: 'Comment ID and content are required',
  });
});

test('updateComment returns 500 when the database is not connected', async () => {
  setReadyState(0);
  const response = createResponse();

  await updateComment(
    createRequest({
      params: { commentId: new mongoose.Types.ObjectId().toString() },
      body: { content: 'new content' },
    }),
    response
  );

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, { message: 'Database not connected' });
});

test('updateComment returns 404 when the comment does not exist', async () => {
  setReadyState(1);
  (Comment as unknown as { findById: unknown }).findById = () => ({
    select: async () => null,
  });
  const response = createResponse();

  await updateComment(
    createRequest({
      params: { commentId: new mongoose.Types.ObjectId().toString() },
      body: { content: 'new content' },
    }),
    response
  );

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, { message: 'Comment not found' });
});

test('updateComment returns 403 when the caller does not own the comment', async () => {
  setReadyState(1);
  const authorId = new mongoose.Types.ObjectId();
  (Comment as unknown as { findById: unknown }).findById = () => ({
    select: async () => ({ author: authorId }),
  });
  const response = createResponse();

  await updateComment(
    createRequest({
      params: { commentId: new mongoose.Types.ObjectId().toString() },
      body: { content: 'new content' },
      userId: new mongoose.Types.ObjectId().toString(),
    }),
    response
  );

  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, {
    message: 'You can only modify your own comments',
  });
});

test('updateComment updates the comment when the caller is the author', async () => {
  setReadyState(1);
  const authorId = new mongoose.Types.ObjectId();
  const commentId = new mongoose.Types.ObjectId();
  const updated = { _id: commentId, content: 'new content' };

  (Comment as unknown as { findById: unknown }).findById = () => ({
    select: async () => ({ author: authorId }),
  });
  (Comment as unknown as { findByIdAndUpdate: unknown }).findByIdAndUpdate =
    async () => updated;

  const response = createResponse();
  await updateComment(
    createRequest({
      params: { commentId: commentId.toString() },
      body: { content: 'new content' },
      userId: authorId.toString(),
    }),
    response
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    message: 'Comment updated successfully',
    comment: updated,
  });
});

test('getLikes returns 400 when id is missing', async () => {
  const response = createResponse();

  await getLikes(createRequest({ params: {} }), response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { message: 'Comment ID is required' });
});

test('getLikes returns 404 when the comment does not exist', async () => {
  (Comment as unknown as { findById: unknown }).findById = () => ({
    lean: async () => null,
  });
  const response = createResponse();

  await getLikes(
    createRequest({ params: { id: new mongoose.Types.ObjectId().toString() } }),
    response
  );

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, { message: 'Comment not found' });
});

test('getLikes returns the users who liked the comment', async () => {
  const likerId = new mongoose.Types.ObjectId();
  (Comment as unknown as { findById: unknown }).findById = () => ({
    lean: async () => ({ likes: [likerId] }),
  });
  setUsersCollection([{ _id: likerId, name: 'Ada' }]);

  const response = createResponse();
  await getLikes(
    createRequest({ params: { id: new mongoose.Types.ObjectId().toString() } }),
    response
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { likes: [{ _id: likerId, name: 'Ada' }] });
});
