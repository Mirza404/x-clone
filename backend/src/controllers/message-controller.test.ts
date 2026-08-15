import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import mongoose from 'mongoose';
import { Request, Response } from 'express';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import {
  listConversations,
  createConversation,
  getConversationMessages,
  markConversationRead,
} from './message-controller';

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
const originalConversationFind = Conversation.find;
const originalConversationFindById = Conversation.findById;
const originalConversationFindOneAndUpdate = Conversation.findOneAndUpdate;
const originalConversationUpdateOne = Conversation.updateOne;
const originalMessageFind = Message.find;
const originalMessageUpdateMany = Message.updateMany;

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

function setUsersCollection(users: Array<Record<string, unknown>>) {
  Object.defineProperty(mongoose.connection, 'db', {
    configurable: true,
    get: () => ({
      collection: () => ({
        find: () => ({
          project: () => ({
            toArray: async () => users,
          }),
        }),
        findOne: async () => users[0] ?? null,
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

function mockConversationFind(conversations: unknown[]) {
  (Conversation as unknown as { find: (filter: unknown) => unknown }).find =
    () => ({
      sort: () => ({
        populate: () => ({
          lean: async () => conversations,
        }),
      }),
    });
}

function mockConversationFindByIdSelectLean(conversation: unknown) {
  (Conversation as unknown as { findById: (id: unknown) => unknown }).findById =
    () => ({
      select: () => ({
        lean: async () => conversation,
      }),
    });
}

function mockConversationFindByIdSelect(conversation: unknown) {
  (Conversation as unknown as { findById: (id: unknown) => unknown }).findById =
    () => ({
      select: async () => conversation,
    });
}

function mockMessageFind(messages: unknown[]) {
  (Message as unknown as { find: (filter: unknown) => unknown }).find = () => ({
    sort: () => ({
      limit: () => ({
        lean: async () => messages,
      }),
    }),
  });
}

afterEach(() => {
  restoreReadyState();
  restoreDb();
  (Conversation as unknown as { find: typeof originalConversationFind }).find =
    originalConversationFind;
  (
    Conversation as unknown as {
      findById: typeof originalConversationFindById;
    }
  ).findById = originalConversationFindById;
  (
    Conversation as unknown as {
      findOneAndUpdate: typeof originalConversationFindOneAndUpdate;
    }
  ).findOneAndUpdate = originalConversationFindOneAndUpdate;
  (
    Conversation as unknown as {
      updateOne: typeof originalConversationUpdateOne;
    }
  ).updateOne = originalConversationUpdateOne;
  (Message as unknown as { find: typeof originalMessageFind }).find =
    originalMessageFind;
  (
    Message as unknown as { updateMany: typeof originalMessageUpdateMany }
  ).updateMany = originalMessageUpdateMany;
});

test('listConversations returns 401 without auth', async () => {
  const response = createResponse();

  await listConversations(createRequest({}), response);

  assert.equal(response.statusCode, 401);
});

test('listConversations returns the other participant, last message, and unread count', async () => {
  setReadyState(1);
  const userId = new mongoose.Types.ObjectId();
  const otherId = new mongoose.Types.ObjectId();
  const conversationId = new mongoose.Types.ObjectId();

  mockConversationFind([
    {
      _id: conversationId,
      participants: [userId, otherId],
      lastMessage: { content: 'hi' },
      lastMessageAt: new Date(),
      unread: [
        { user: userId, count: 3 },
        { user: otherId, count: 0 },
      ],
    },
  ]);
  setUsersCollection([{ _id: otherId, name: 'Ada', image: 'ada.png' }]);

  const response = createResponse();

  await listConversations(
    createRequest({ userId: userId.toString() }),
    response
  );

  assert.equal(response.statusCode, 200);
  const body = response.body as {
    conversations: Array<{ unreadCount: number; participant: unknown }>;
  };
  assert.equal(body.conversations[0]?.unreadCount, 3);
  assert.deepEqual(body.conversations[0]?.participant, {
    id: otherId,
    name: 'Ada',
    image: 'ada.png',
  });
});

test('createConversation returns 400 for an invalid recipientId', async () => {
  setReadyState(1);
  const response = createResponse();

  await createConversation(
    createRequest({
      userId: new mongoose.Types.ObjectId().toString(),
      body: { recipientId: 'not-an-id' },
    }),
    response
  );

  assert.equal(response.statusCode, 400);
});

test('createConversation returns 400 when messaging yourself', async () => {
  setReadyState(1);
  const userId = new mongoose.Types.ObjectId().toString();
  const response = createResponse();

  await createConversation(
    createRequest({ userId, body: { recipientId: userId } }),
    response
  );

  assert.equal(response.statusCode, 400);
});

test('createConversation returns 404 when the recipient does not exist', async () => {
  setReadyState(1);
  setUsersCollection([]);
  const response = createResponse();

  await createConversation(
    createRequest({
      userId: new mongoose.Types.ObjectId().toString(),
      body: { recipientId: new mongoose.Types.ObjectId().toString() },
    }),
    response
  );

  assert.equal(response.statusCode, 404);
});

test('createConversation atomically gets or creates the participant pair', async () => {
  setReadyState(1);
  const userId = new mongoose.Types.ObjectId();
  const recipientId = new mongoose.Types.ObjectId();
  const existing = { _id: new mongoose.Types.ObjectId() };

  setUsersCollection([{ _id: recipientId }]);
  let upsertOptions: Record<string, unknown> | undefined;
  (
    Conversation as unknown as {
      findOneAndUpdate: (
        filter: unknown,
        update: unknown,
        options: Record<string, unknown>
      ) => Promise<unknown>;
    }
  ).findOneAndUpdate = async (_filter, _update, options) => {
    upsertOptions = options;
    return existing;
  };

  const response = createResponse();

  await createConversation(
    createRequest({
      userId: userId.toString(),
      body: { recipientId: recipientId.toString() },
    }),
    response
  );

  assert.equal(response.statusCode, 200);
  assert.equal(upsertOptions?.upsert, true);
  assert.deepEqual(response.body, { conversation: existing });
});

test('getConversationMessages returns 403 for a non-participant', async () => {
  setReadyState(1);
  const conversationId = new mongoose.Types.ObjectId();
  mockConversationFindByIdSelectLean({
    _id: conversationId,
    participants: [
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
    ],
  });

  const response = createResponse();

  await getConversationMessages(
    createRequest({
      params: { id: conversationId.toString() },
      userId: new mongoose.Types.ObjectId().toString(),
    }),
    response
  );

  assert.equal(response.statusCode, 403);
});

test('getConversationMessages returns paginated history in chronological order', async () => {
  setReadyState(1);
  const userId = new mongoose.Types.ObjectId();
  const conversationId = new mongoose.Types.ObjectId();
  const older = { content: 'first', createdAt: new Date(1000) };
  const newer = { content: 'second', createdAt: new Date(2000) };

  mockConversationFindByIdSelectLean({
    _id: conversationId,
    participants: [userId, new mongoose.Types.ObjectId()],
  });
  mockMessageFind([newer, older]);

  const response = createResponse();

  await getConversationMessages(
    createRequest({
      params: { id: conversationId.toString() },
      userId: userId.toString(),
    }),
    response
  );

  assert.equal(response.statusCode, 200);
  const body = response.body as { messages: Array<{ content: string }> };
  assert.deepEqual(
    body.messages.map((m) => m.content),
    ['first', 'second']
  );
});

test('getConversationMessages rejects invalid limits', async () => {
  setReadyState(1);
  const userId = new mongoose.Types.ObjectId();
  const conversationId = new mongoose.Types.ObjectId();
  mockConversationFindByIdSelectLean({
    _id: conversationId,
    participants: [userId, new mongoose.Types.ObjectId()],
  });

  for (const limit of ['0', '-1', '1.5', 'invalid', '', ['20']]) {
    const response = createResponse();
    await getConversationMessages(
      createRequest({
        params: { id: conversationId.toString() },
        query: { limit },
        userId: userId.toString(),
      }),
      response
    );

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.body, { message: 'Invalid message limit' });
  }
});

test('getConversationMessages caps limits at 100 messages', async () => {
  setReadyState(1);
  const userId = new mongoose.Types.ObjectId();
  const conversationId = new mongoose.Types.ObjectId();
  let databaseLimit: number | undefined;
  mockConversationFindByIdSelectLean({
    _id: conversationId,
    participants: [userId, new mongoose.Types.ObjectId()],
  });
  (
    Message as unknown as { find: (filter: Record<string, unknown>) => unknown }
  ).find = () => ({
    sort: () => ({
      limit: (limit: number) => {
        databaseLimit = limit;
        return { lean: async () => [] };
      },
    }),
  });

  const response = createResponse();
  await getConversationMessages(
    createRequest({
      params: { id: conversationId.toString() },
      query: { limit: '1000' },
      userId: userId.toString(),
    }),
    response
  );

  assert.equal(response.statusCode, 200);
  // One extra record is fetched to determine whether another cursor exists.
  assert.equal(databaseLimit, 101);
});

test('getConversationMessages cursor is stable when newer messages arrive between requests', async () => {
  setReadyState(1);
  const userId = new mongoose.Types.ObjectId();
  const conversationId = new mongoose.Types.ObjectId();
  const makeStoredMessage = (content: string, timestamp: number) => ({
    _id: new mongoose.Types.ObjectId(),
    conversation: conversationId,
    content,
    createdAt: new Date(timestamp),
  });
  const first = makeStoredMessage('first', 1000);
  const second = makeStoredMessage('second', 2000);
  const third = makeStoredMessage('third', 3000);
  const fourth = makeStoredMessage('fourth', 4000);
  let storedMessages = [fourth, third, second, first];

  mockConversationFindByIdSelectLean({
    _id: conversationId,
    participants: [userId, new mongoose.Types.ObjectId()],
  });
  (
    Message as unknown as { find: (filter: Record<string, unknown>) => unknown }
  ).find = (filter) => ({
    sort: () => ({
      limit: (limit: number) => ({
        lean: async () => {
          const boundary = filter.$or as
            | [
                { createdAt: { $lt: Date } },
                { createdAt: Date; _id: { $lt: mongoose.Types.ObjectId } },
              ]
            | undefined;
          const filtered = boundary
            ? storedMessages.filter(
                (message) =>
                  message.createdAt < boundary[0].createdAt.$lt ||
                  (message.createdAt.getTime() ===
                    boundary[1].createdAt.getTime() &&
                    message._id.toString() < boundary[1]._id.$lt.toString())
              )
            : storedMessages;
          return filtered.slice(0, limit);
        },
      }),
    }),
  });

  const newestPage = createResponse();
  await getConversationMessages(
    createRequest({
      params: { id: conversationId.toString() },
      query: { limit: '2' },
      userId: userId.toString(),
    }),
    newestPage
  );

  const newestBody = newestPage.body as {
    messages: Array<{ content: string }>;
    nextCursor: string;
  };
  assert.deepEqual(
    newestBody.messages.map((message) => message.content),
    ['third', 'fourth']
  );

  storedMessages = [
    makeStoredMessage('arrived while paging', 5000),
    ...storedMessages,
  ];

  const olderPage = createResponse();
  await getConversationMessages(
    createRequest({
      params: { id: conversationId.toString() },
      query: { limit: '2', cursor: newestBody.nextCursor },
      userId: userId.toString(),
    }),
    olderPage
  );

  const olderBody = olderPage.body as {
    messages: Array<{ content: string }>;
    nextCursor: null;
  };
  assert.deepEqual(
    olderBody.messages.map((message) => message.content),
    ['first', 'second']
  );
  assert.equal(olderBody.nextCursor, null);
});

test('getConversationMessages rejects a malformed cursor', async () => {
  setReadyState(1);
  const userId = new mongoose.Types.ObjectId();
  const conversationId = new mongoose.Types.ObjectId();
  mockConversationFindByIdSelectLean({
    _id: conversationId,
    participants: [userId, new mongoose.Types.ObjectId()],
  });

  const response = createResponse();
  await getConversationMessages(
    createRequest({
      params: { id: conversationId.toString() },
      query: { cursor: 'not-a-cursor' },
      userId: userId.toString(),
    }),
    response
  );

  assert.equal(response.statusCode, 400);
});

test('markConversationRead returns 403 for a non-participant', async () => {
  setReadyState(1);
  const conversationId = new mongoose.Types.ObjectId();
  mockConversationFindByIdSelect({
    _id: conversationId,
    participants: [
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
    ],
  });

  const response = createResponse();

  await markConversationRead(
    createRequest({
      params: { id: conversationId.toString() },
      userId: new mongoose.Types.ObjectId().toString(),
    }),
    response
  );

  assert.equal(response.statusCode, 403);
});

test('markConversationRead resets the unread counter and marks messages read', async () => {
  setReadyState(1);
  const userId = new mongoose.Types.ObjectId();
  const conversationId = new mongoose.Types.ObjectId();
  const calls: unknown[] = [];

  mockConversationFindByIdSelect({
    _id: conversationId,
    participants: [userId, new mongoose.Types.ObjectId()],
  });
  (
    Conversation as unknown as {
      updateOne: (filter: unknown, update: unknown) => Promise<unknown>;
    }
  ).updateOne = async (filter, update) => {
    calls.push(['Conversation.updateOne', filter, update]);
  };
  (
    Message as unknown as {
      updateMany: (filter: unknown, update: unknown) => Promise<unknown>;
    }
  ).updateMany = async (filter, update) => {
    calls.push(['Message.updateMany', filter, update]);
  };

  const response = createResponse();

  await markConversationRead(
    createRequest({
      params: { id: conversationId.toString() },
      userId: userId.toString(),
    }),
    response
  );

  assert.equal(response.statusCode, 200);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1], [
    'Message.updateMany',
    {
      conversation: conversationId.toString(),
      sender: { $ne: userId },
      readBy: { $ne: userId },
    },
    { $addToSet: { readBy: userId } },
  ]);
});
