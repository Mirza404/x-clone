import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';
import mongoose from 'mongoose';
import { Request, Response } from 'express';
import type { Server } from 'socket.io';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import { MediaValidationError, mediaService } from '../services/media-service';
import {
  listConversations,
  createConversation,
  getConversationMessages,
  sendMessage,
  markConversationRead,
} from './message-controller';

type MockResponse = Response & {
  statusCode?: number;
  body?: unknown;
};

type Emission = { room: string; event: string; payload: unknown };

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
const originalConversationFindOne = Conversation.findOne;
const originalConversationUpdateOne = Conversation.updateOne;
const originalMessageFind = Message.find;
const originalMessageFindOne = Message.findOne;
const originalMessageCreate = Message.create;
const originalMessageUpdateMany = Message.updateMany;
const originalAssertOwnedImageUrls = mediaService.assertOwnedImageUrls;

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
  socketIo?: Server;
}): Request {
  return {
    params: options.params ?? {},
    body: options.body ?? {},
    query: options.query ?? {},
    userId: options.userId,
    app: {
      get: (name: string) =>
        name === 'socketIo' ? options.socketIo : undefined,
    },
  } as Request;
}

function createIo(): { io: Server; emissions: Emission[] } {
  const emissions: Emission[] = [];
  const io = {
    to(room: string) {
      return {
        emit(event: string, payload: unknown) {
          emissions.push({ room, event, payload });
        },
      };
    },
  } as unknown as Server;
  return { io, emissions };
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
    Conversation as unknown as { findOne: typeof originalConversationFindOne }
  ).findOne = originalConversationFindOne;
  (
    Conversation as unknown as {
      updateOne: typeof originalConversationUpdateOne;
    }
  ).updateOne = originalConversationUpdateOne;
  (Message as unknown as { find: typeof originalMessageFind }).find =
    originalMessageFind;
  (Message as unknown as { findOne: typeof originalMessageFindOne }).findOne =
    originalMessageFindOne;
  (Message as unknown as { create: typeof originalMessageCreate }).create =
    originalMessageCreate;
  (
    Message as unknown as { updateMany: typeof originalMessageUpdateMany }
  ).updateMany = originalMessageUpdateMany;
  mediaService.assertOwnedImageUrls = originalAssertOwnedImageUrls;
});

function stubMediaValidation(
  implementation: typeof mediaService.assertOwnedImageUrls
): void {
  mediaService.assertOwnedImageUrls = implementation;
}

beforeEach(() => {
  stubMediaValidation(async (_userId, images) => images as string[]);
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

test('createConversation resolves a race between both participants starting the same DM at once to one conversation', async () => {
  // Both users hit POST /api/message/conversations for each other within
  // the same tick: userA -> userB and userB -> userA. The unique
  // participantsKey index means only one upsert can win; the loser must
  // fall back to reading the winner instead of surfacing a 500.
  setReadyState(1);
  const userA = new mongoose.Types.ObjectId();
  const userB = new mongoose.Types.ObjectId();
  const winner = { _id: new mongoose.Types.ObjectId() };

  setUsersCollection([{ _id: userB }]);

  let upsertCalls = 0;
  (
    Conversation as unknown as {
      findOneAndUpdate: (...args: unknown[]) => Promise<unknown>;
    }
  ).findOneAndUpdate = async () => {
    upsertCalls += 1;
    if (upsertCalls === 1) {
      return winner;
    }
    const error = new Error('duplicate key') as Error & { code: number };
    error.code = 11000;
    throw error;
  };
  (Conversation as unknown as { findOne: () => Promise<unknown> }).findOne =
    async () => winner;

  const responseA = createResponse();
  const responseB = createResponse();

  await Promise.all([
    createConversation(
      createRequest({
        userId: userA.toString(),
        body: { recipientId: userB.toString() },
      }),
      responseA
    ),
    createConversation(
      createRequest({
        userId: userB.toString(),
        body: { recipientId: userA.toString() },
      }),
      responseB
    ),
  ]);

  assert.equal(responseA.statusCode, 200);
  assert.equal(responseB.statusCode, 200);
  assert.deepEqual(responseA.body, { conversation: winner });
  assert.deepEqual(responseB.body, { conversation: winner });
  assert.equal(upsertCalls, 2);
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

  const maliciousLimits: unknown[] = [
    '0',
    '-1',
    '1.5',
    'invalid',
    '',
    ['20'],
    '99999999999999999999', // exceeds Number.isSafeInteger
    '1e5', // scientific notation, not a plain integer
    { $gt: '' }, // NoSQL-injection-shaped query value
  ];

  for (const limit of maliciousLimits) {
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

test('sendMessage returns 401 without auth', async () => {
  const response = createResponse();

  await sendMessage(
    createRequest({ params: { id: new mongoose.Types.ObjectId().toString() } }),
    response
  );

  assert.equal(response.statusCode, 401);
});

test('sendMessage returns 400 for an invalid conversation id', async () => {
  setReadyState(1);
  const response = createResponse();

  await sendMessage(
    createRequest({
      userId: new mongoose.Types.ObjectId().toString(),
      params: { id: 'not-an-id' },
      body: { content: 'hello', clientId: 'c1' },
    }),
    response
  );

  assert.equal(response.statusCode, 400);
});

test('sendMessage returns 400 for blank content', async () => {
  setReadyState(1);
  const response = createResponse();

  await sendMessage(
    createRequest({
      userId: new mongoose.Types.ObjectId().toString(),
      params: { id: new mongoose.Types.ObjectId().toString() },
      body: { content: '   ', clientId: 'c1' },
    }),
    response
  );

  assert.equal(response.statusCode, 400);
});

test('sendMessage returns 400 for a missing clientId', async () => {
  setReadyState(1);
  const response = createResponse();

  await sendMessage(
    createRequest({
      userId: new mongoose.Types.ObjectId().toString(),
      params: { id: new mongoose.Types.ObjectId().toString() },
      body: { content: 'hello' },
    }),
    response
  );

  assert.equal(response.statusCode, 400);
  assert.match((response.body as { message: string }).message, /clientId/);
});

test('sendMessage returns 404 when the conversation does not exist', async () => {
  setReadyState(1);
  (Conversation as unknown as { findById: (id: unknown) => unknown }).findById =
    () => null;

  const response = createResponse();

  await sendMessage(
    createRequest({
      userId: new mongoose.Types.ObjectId().toString(),
      params: { id: new mongoose.Types.ObjectId().toString() },
      body: { content: 'hello', clientId: 'c1' },
    }),
    response
  );

  assert.equal(response.statusCode, 404);
});

test('sendMessage returns 403 for a non-participant', async () => {
  setReadyState(1);
  const conversationId = new mongoose.Types.ObjectId();
  (Conversation as unknown as { findById: (id: unknown) => unknown }).findById =
    () => ({
      _id: conversationId,
      participants: [
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
      ],
    });

  const response = createResponse();

  await sendMessage(
    createRequest({
      userId: new mongoose.Types.ObjectId().toString(),
      params: { id: conversationId.toString() },
      body: { content: 'hello', clientId: 'c1' },
    }),
    response
  );

  assert.equal(response.statusCode, 403);
});

test('sendMessage rejects images that fail ownership validation', async () => {
  setReadyState(1);
  const userId = new mongoose.Types.ObjectId();
  const conversationId = new mongoose.Types.ObjectId();
  (Conversation as unknown as { findById: (id: unknown) => unknown }).findById =
    () => ({ _id: conversationId, participants: [userId] });
  stubMediaValidation(async () => {
    throw new MediaValidationError(
      'Image is not owned by the authenticated user'
    );
  });

  const response = createResponse();

  await sendMessage(
    createRequest({
      userId: userId.toString(),
      params: { id: conversationId.toString() },
      body: {
        content: 'hello',
        clientId: 'c1',
        images: ['https://example.com/unowned.png'],
      },
    }),
    response
  );

  assert.equal(response.statusCode, 400);
  assert.equal(
    (response.body as { message: string }).message,
    'Image is not owned by the authenticated user'
  );
});

test('sendMessage rejects a non-array images value', async () => {
  setReadyState(1);
  const userId = new mongoose.Types.ObjectId();
  const conversationId = new mongoose.Types.ObjectId();
  (Conversation as unknown as { findById: (id: unknown) => unknown }).findById =
    () => ({ _id: conversationId, participants: [userId] });
  stubMediaValidation(async (_senderId, images) => {
    if (!Array.isArray(images)) {
      throw new MediaValidationError('Images must be an array');
    }
    return images as string[];
  });

  const response = createResponse();
  await sendMessage(
    createRequest({
      userId: userId.toString(),
      params: { id: conversationId.toString() },
      body: { content: 'hello', clientId: 'c1', images: 'not-an-array' },
    }),
    response
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { message: 'Images must be an array' });
});

test('sendMessage persists a new message and updates the conversation summary', async () => {
  setReadyState(1);
  const userId = new mongoose.Types.ObjectId();
  const recipientId = new mongoose.Types.ObjectId();
  const conversationId = new mongoose.Types.ObjectId();
  const conversation = {
    _id: conversationId,
    participants: [userId, recipientId],
  };
  (Conversation as unknown as { findById: (id: unknown) => unknown }).findById =
    () => conversation;

  (Message as unknown as { findOne: () => Promise<unknown> }).findOne =
    async () => null;

  const createdMessage = {
    _id: new mongoose.Types.ObjectId(),
    conversation: conversationId,
    sender: userId,
    content: 'hi',
    clientId: 'rest-1',
    createdAt: new Date(),
  };
  let createCalls = 0;
  (
    Message as unknown as { create: (args: unknown) => Promise<unknown> }
  ).create = async () => {
    createCalls += 1;
    return createdMessage;
  };

  const updatedConversation = {
    ...conversation,
    lastMessage: createdMessage._id,
  };
  (
    Conversation as unknown as {
      findOneAndUpdate: (
        filter: unknown,
        update: unknown,
        options: unknown
      ) => Promise<unknown>;
    }
  ).findOneAndUpdate = async () => updatedConversation;

  const response = createResponse();
  const { io, emissions } = createIo();

  await sendMessage(
    createRequest({
      userId: userId.toString(),
      params: { id: conversationId.toString() },
      body: { content: 'hi', clientId: 'rest-1' },
      socketIo: io,
    }),
    response
  );

  assert.equal(response.statusCode, 200);
  assert.equal(createCalls, 1);
  const body = response.body as { message: unknown; conversation: unknown };
  assert.equal(body.message, createdMessage);
  assert.equal(body.conversation, updatedConversation);
  assert.deepEqual(
    emissions.map(({ room, event }) => ({ room, event })),
    [
      { room: `user:${userId.toString()}`, event: 'message:new' },
      { room: `user:${recipientId.toString()}`, event: 'message:new' },
    ]
  );
});

test('sendMessage is idempotent: a retried clientId returns the existing message instead of creating a duplicate', async () => {
  setReadyState(1);
  const userId = new mongoose.Types.ObjectId();
  const conversationId = new mongoose.Types.ObjectId();
  (Conversation as unknown as { findById: (id: unknown) => unknown }).findById =
    () => ({ _id: conversationId, participants: [userId] });

  const existingMessage = {
    _id: new mongoose.Types.ObjectId(),
    conversation: conversationId,
    sender: userId,
    content: 'hi',
    clientId: 'rest-retry',
    createdAt: new Date(),
  };
  (Message as unknown as { findOne: () => Promise<unknown> }).findOne =
    async () => existingMessage;

  let createCalled = false;
  (Message as unknown as { create: () => Promise<unknown> }).create =
    async () => {
      createCalled = true;
      return existingMessage;
    };
  const { io, emissions } = createIo();

  // First send and a retried send with the same clientId should both land
  // here and both resolve to the same persisted message.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = createResponse();
    await sendMessage(
      createRequest({
        userId: userId.toString(),
        params: { id: conversationId.toString() },
        body: { content: 'hi', clientId: 'rest-retry' },
        socketIo: io,
      }),
      response
    );

    assert.equal(response.statusCode, 200);
    assert.equal(
      (response.body as { message: unknown }).message,
      existingMessage
    );
  }

  assert.equal(createCalled, false);
  assert.equal(emissions.length, 0);
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
