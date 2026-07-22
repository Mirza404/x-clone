import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import mongoose from 'mongoose';
import { Request, Response } from 'express';
import Post from '../models/Post';
import Comment from '../models/Comment';
import {
  deletePost,
  toggleLike,
  allPosts,
  getPost,
  createPost,
  updatePost,
  getLikes,
} from './post-controller';

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
const originalFindByIdAndUpdate = Post.findByIdAndUpdate;
const originalFind = Post.find;
const originalCountDocuments = Post.countDocuments;
const originalDb = Object.getOwnPropertyDescriptor(mongoose.connection, 'db');
const originalCommentFindById = Comment.findById;
const originalPostSave = Post.prototype.save;

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

function createRequest(
  body: Record<string, unknown>,
  userId?: string
): Request {
  return { body, userId } as Request;
}

function createQueryRequest(query: Record<string, unknown>): Request {
  return { query } as unknown as Request;
}

function setEmptyUsersCollection() {
  Object.defineProperty(mongoose.connection, 'db', {
    configurable: true,
    get: () => ({
      collection: () => ({
        findOne: async () => null,
      }),
    }),
  });
}

function createParamsRequest(
  params: Record<string, unknown>,
  userId?: string
): Request {
  return { params, userId } as unknown as Request;
}

function setUsersDb(
  usersById: Record<string, Record<string, unknown>>,
  likeUsers: Array<Record<string, unknown>> = []
) {
  Object.defineProperty(mongoose.connection, 'db', {
    configurable: true,
    get: () => ({
      collection: () => ({
        findOne: async (query: { _id: { toString(): string } }) =>
          usersById[query._id.toString()] ?? null,
        find: () => ({
          project: () => ({
            toArray: async () => likeUsers,
          }),
        }),
      }),
    }),
  });
}

function mockPostFindByIdLean(post: unknown) {
  (Post as unknown as { findById: (id: unknown) => unknown }).findById =
    () => ({
      lean: async () => post,
    });
}

function mockCommentFindByIdLean(commentsById: Record<string, unknown>) {
  (
    Comment as unknown as { findById: (id: { toString(): string }) => unknown }
  ).findById = (id: { toString(): string }) => ({
    lean: async () => commentsById[id.toString()] ?? null,
  });
}

afterEach(() => {
  restoreReadyState();
  (Post as unknown as { findById: typeof originalFindById }).findById =
    originalFindById;
  (Post as unknown as { deleteOne: typeof originalDeleteOne }).deleteOne =
    originalDeleteOne;
  (Comment as unknown as { deleteMany: typeof originalDeleteMany }).deleteMany =
    originalDeleteMany;
  (
    Post as unknown as { findByIdAndUpdate: typeof originalFindByIdAndUpdate }
  ).findByIdAndUpdate = originalFindByIdAndUpdate;
  (Post as unknown as { find: typeof originalFind }).find = originalFind;
  (
    Post as unknown as { countDocuments: typeof originalCountDocuments }
  ).countDocuments = originalCountDocuments;
  (
    Comment as unknown as { findById: typeof originalCommentFindById }
  ).findById = originalCommentFindById;
  Post.prototype.save = originalPostSave;
  if (originalDb) {
    Object.defineProperty(mongoose.connection, 'db', originalDb);
  }
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
  const authorId = new mongoose.Types.ObjectId();
  const calls: unknown[] = [];
  (Post as unknown as { findById: unknown }).findById = () => ({
    select: async () => ({ _id: postId, author: authorId }),
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

  await deletePost(
    createRequest({ id: postId.toString() }, authorId.toString()),
    response
  );

  assert.deepEqual(calls, [
    ['Comment.deleteMany', { postId }],
    ['Post.deleteOne', { _id: postId }],
  ]);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { message: 'Post deleted successfully' });
});

test('deletePost returns 403 when the caller does not own the post', async () => {
  setReadyState(1);
  const postId = new mongoose.Types.ObjectId();
  const authorId = new mongoose.Types.ObjectId();
  const otherUserId = new mongoose.Types.ObjectId().toString();
  let deleteOneCalled = false;
  (Post as unknown as { findById: unknown }).findById = () => ({
    select: async () => ({ _id: postId, author: authorId }),
  });
  (Post as unknown as { deleteOne: unknown }).deleteOne = async () => {
    deleteOneCalled = true;
  };
  const response = createResponse();

  await deletePost(
    createRequest({ id: postId.toString() }, otherUserId),
    response
  );

  assert.equal(response.statusCode, 403);
  assert.equal(deleteOneCalled, false);
});

test('toggleLike unlikes when a string authorId matches an ObjectId already stored in likes', async () => {
  setReadyState(1);
  const postId = new mongoose.Types.ObjectId();
  const authorObjectId = new mongoose.Types.ObjectId();
  const calls: unknown[] = [];

  (Post as unknown as { findById: unknown }).findById = async () => ({
    likes: [authorObjectId],
  });
  (Post as unknown as { findByIdAndUpdate: unknown }).findByIdAndUpdate =
    async (id: unknown, update: unknown) => {
      calls.push(update);
    };

  const response = createResponse();

  // req.userId arrives as a string from the verified token, likes are stored as ObjectIds.
  await toggleLike(
    createRequest({ id: postId.toString() }, authorObjectId.toString()),
    response
  );

  assert.deepEqual(calls, [{ $pull: { likes: authorObjectId } }]);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { message: 'Post unliked' });
});

test('toggleLike likes the post when the author has not liked it yet', async () => {
  setReadyState(1);
  const postId = new mongoose.Types.ObjectId();
  const authorId = new mongoose.Types.ObjectId().toString();
  const calls: unknown[] = [];

  (Post as unknown as { findById: unknown }).findById = async () => ({
    likes: [],
  });
  (Post as unknown as { findByIdAndUpdate: unknown }).findByIdAndUpdate =
    async (id: unknown, update: unknown) => {
      calls.push(update);
    };

  const response = createResponse();

  await toggleLike(
    createRequest({ id: postId.toString() }, authorId),
    response
  );

  assert.equal(calls.length, 1);
  assert.deepEqual(response.body, { message: 'Post liked' });
});

test('allPosts fetches without an author filter when none is given', async () => {
  setReadyState(1);
  setEmptyUsersCollection();
  const findCalls: unknown[] = [];
  const countCalls: unknown[] = [];

  (Post as unknown as { find: (filter: unknown) => unknown }).find = (
    filter: unknown
  ) => {
    findCalls.push(filter);
    return {
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: async () => [],
          }),
        }),
      }),
    };
  };
  (
    Post as unknown as { countDocuments: (filter: unknown) => Promise<number> }
  ).countDocuments = async (filter: unknown) => {
    countCalls.push(filter);
    return 0;
  };

  const response = createResponse();
  await allPosts(createQueryRequest({}), response);

  assert.deepEqual(findCalls, [{}]);
  assert.deepEqual(countCalls, [{}]);
  assert.equal(response.statusCode, 200);
});

test('allPosts filters by author when a valid author id is given', async () => {
  setReadyState(1);
  setEmptyUsersCollection();
  const authorId = new mongoose.Types.ObjectId().toString();
  const findCalls: unknown[] = [];

  (Post as unknown as { find: (filter: unknown) => unknown }).find = (
    filter: unknown
  ) => {
    findCalls.push(filter);
    return {
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: async () => [],
          }),
        }),
      }),
    };
  };
  (
    Post as unknown as { countDocuments: (filter: unknown) => Promise<number> }
  ).countDocuments = async () => 0;

  const response = createResponse();
  await allPosts(createQueryRequest({ author: authorId }), response);

  assert.deepEqual(findCalls, [{ author: authorId }]);
  assert.equal(response.statusCode, 200);
});

test('allPosts ignores an invalid author id', async () => {
  setReadyState(1);
  setEmptyUsersCollection();
  const findCalls: unknown[] = [];

  (Post as unknown as { find: (filter: unknown) => unknown }).find = (
    filter: unknown
  ) => {
    findCalls.push(filter);
    return {
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: async () => [],
          }),
        }),
      }),
    };
  };
  (
    Post as unknown as { countDocuments: (filter: unknown) => Promise<number> }
  ).countDocuments = async () => 0;

  const response = createResponse();
  await allPosts(createQueryRequest({ author: 'not-an-id' }), response);

  assert.deepEqual(findCalls, [{}]);
  assert.equal(response.statusCode, 200);
});

test('getPost returns 400 when id is missing', async () => {
  const response = createResponse();

  await getPost(createParamsRequest({}), response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { message: 'Post ID is required' });
});

test('getPost returns 500 when the database is not connected', async () => {
  setReadyState(0);
  const response = createResponse();

  await getPost(
    createParamsRequest({ id: new mongoose.Types.ObjectId() }),
    response
  );

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, { message: 'Database not connected' });
});

test('getPost returns 404 when the post does not exist', async () => {
  setReadyState(1);
  mockPostFindByIdLean(null);
  const response = createResponse();

  await getPost(
    createParamsRequest({ id: new mongoose.Types.ObjectId().toString() }),
    response
  );

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, { message: 'Post not found' });
});

test('getPost returns the post with comments and author images', async () => {
  setReadyState(1);
  const postId = new mongoose.Types.ObjectId();
  const postAuthorId = new mongoose.Types.ObjectId();
  const commentId = new mongoose.Types.ObjectId();
  const commentAuthorId = new mongoose.Types.ObjectId();
  const createdAt = new Date();

  mockPostFindByIdLean({
    _id: postId,
    content: 'hello world',
    images: [],
    name: 'Ada',
    createdAt,
    likes: [],
    author: postAuthorId,
    comments: [commentId],
  });
  mockCommentFindByIdLean({
    [commentId.toString()]: {
      _id: commentId,
      content: 'nice post',
      name: 'Bob',
      createdAt,
      likes: [],
      author: commentAuthorId,
    },
  });
  setUsersDb({
    [commentAuthorId.toString()]: { image: 'bob.png' },
    [postAuthorId.toString()]: { image: 'ada.png' },
  });

  const response = createResponse();
  await getPost(createParamsRequest({ id: postId.toString() }), response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    id: postId,
    content: 'hello world',
    images: [],
    name: 'Ada',
    createdAt,
    likes: [],
    author: postAuthorId,
    authorImage: 'ada.png',
    comments: [
      {
        id: commentId,
        content: 'nice post',
        name: 'Bob',
        createdAt,
        likes: [],
        author: commentAuthorId,
        authorImage: 'bob.png',
      },
    ],
  });
});

test('createPost returns 401 when unauthenticated', async () => {
  const response = createResponse();

  await createPost(createRequest({ content: 'hello' }), response);

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.body, { message: 'Authentication required' });
});

test('createPost returns 400 when there is no content or images', async () => {
  const authorId = new mongoose.Types.ObjectId().toString();
  setUsersDb({ [authorId]: { name: 'Ada' } });
  const response = createResponse();

  await createPost(
    createRequest({ content: '', images: [] }, authorId),
    response
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    message: 'Post must have content or at least one image',
  });
});

test('createPost returns 500 when the database is not connected', async () => {
  setReadyState(0);
  const authorId = new mongoose.Types.ObjectId().toString();
  setUsersDb({ [authorId]: { name: 'Ada' } });
  const response = createResponse();

  await createPost(createRequest({ content: 'hello' }, authorId), response);

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, { message: 'Database not connected' });
});

test('createPost creates a post and returns it', async () => {
  setReadyState(1);
  const authorId = new mongoose.Types.ObjectId().toString();
  setUsersDb({ [authorId]: { name: 'Ada', image: 'ada.png' } });
  Post.prototype.save = async function mockSave(this: unknown) {
    return this;
  };

  const response = createResponse();
  await createPost(
    createRequest({ content: 'hello world', images: [] }, authorId),
    response
  );

  assert.equal(response.statusCode, 201);
  assert.equal(
    (response.body as { message: string }).message,
    'Post created successfully'
  );
});

test('createPost returns 500 when an unexpected error is thrown', async () => {
  const authorId = new mongoose.Types.ObjectId().toString();
  setUsersDb({});
  const response = createResponse();

  await createPost(createRequest({ content: 'hello' }, authorId), response);

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, { message: 'Internal server error' });
});

test('updatePost returns 400 when id or content is missing', async () => {
  const response = createResponse();

  await updatePost(createRequest({}), response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    message: 'Post ID and content are required',
  });
});

test('updatePost returns 400 when images is not an array', async () => {
  const response = createResponse();

  await updatePost(
    createRequest({
      id: new mongoose.Types.ObjectId().toString(),
      content: 'hello',
      images: 'not-an-array',
    }),
    response
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { message: 'Images must be an array' });
});

test('updatePost returns 500 when the database is not connected', async () => {
  setReadyState(0);
  const response = createResponse();

  await updatePost(
    createRequest({
      id: new mongoose.Types.ObjectId().toString(),
      content: 'hello',
      images: [],
    }),
    response
  );

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, { message: 'Database not connected' });
});

test('updatePost returns 404 when the post does not exist', async () => {
  setReadyState(1);
  (Post as unknown as { findById: unknown }).findById = () => ({
    select: async () => null,
  });
  const response = createResponse();

  await updatePost(
    createRequest({
      id: new mongoose.Types.ObjectId().toString(),
      content: 'hello',
      images: [],
    }),
    response
  );

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, { message: 'Post not found' });
});

test('updatePost returns 403 when the caller does not own the post', async () => {
  setReadyState(1);
  const authorId = new mongoose.Types.ObjectId();
  (Post as unknown as { findById: unknown }).findById = () => ({
    select: async () => ({ author: authorId }),
  });
  const response = createResponse();

  await updatePost(
    createRequest(
      {
        id: new mongoose.Types.ObjectId().toString(),
        content: 'hello',
        images: [],
      },
      new mongoose.Types.ObjectId().toString()
    ),
    response
  );

  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, {
    message: 'You can only modify your own posts',
  });
});

test('updatePost updates the post when the caller is the author', async () => {
  setReadyState(1);
  const authorId = new mongoose.Types.ObjectId();
  const postId = new mongoose.Types.ObjectId();
  const updated = { _id: postId, content: 'updated' };

  (Post as unknown as { findById: unknown }).findById = () => ({
    select: async () => ({ author: authorId }),
  });
  (Post as unknown as { findByIdAndUpdate: unknown }).findByIdAndUpdate =
    async () => updated;

  const response = createResponse();
  await updatePost(
    createRequest(
      { id: postId.toString(), content: 'updated', images: [] },
      authorId.toString()
    ),
    response
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    message: 'Post updated successfully',
    post: updated,
  });
});

test('getLikes returns 400 when id is missing', async () => {
  const response = createResponse();

  await getLikes(createParamsRequest({}), response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { message: 'Post ID is required' });
});

test('getLikes returns 404 when the post does not exist', async () => {
  mockPostFindByIdLean(null);
  const response = createResponse();

  await getLikes(
    createParamsRequest({ id: new mongoose.Types.ObjectId().toString() }),
    response
  );

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, { message: 'Post not found' });
});

test('getLikes returns the users who liked the post', async () => {
  const likerId = new mongoose.Types.ObjectId();
  mockPostFindByIdLean({ likes: [likerId] });
  setUsersDb({}, [{ _id: likerId, name: 'Ada' }]);

  const response = createResponse();
  await getLikes(
    createParamsRequest({ id: new mongoose.Types.ObjectId().toString() }),
    response
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { likes: [{ _id: likerId, name: 'Ada' }] });
});
