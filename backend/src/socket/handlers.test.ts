import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import mongoose from 'mongoose';
import { Server, Socket } from 'socket.io';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import { registerMessageHandlers } from './handlers';
import { MAX_EVENTS, reset as resetRateLimit } from './rate-limit';

type MessageSendAck = {
  ok: boolean;
  message?: unknown;
  conversation?: unknown;
  error?: string;
};

type Emission = { room: string; event: string; payload: unknown };

type MessageReadAck = { ok: boolean; error?: string };

const originalConversationFindById = Conversation.findById;
const originalConversationFindOne = Conversation.findOne;
const originalConversationCreate = Conversation.create;
const originalMessageCreate = Message.create;
const originalMessageFindOne = Message.findOne;
const originalMessageUpdateMany = Message.updateMany;

afterEach(() => {
  (
    Conversation as unknown as { findById: typeof originalConversationFindById }
  ).findById = originalConversationFindById;
  (
    Conversation as unknown as { findOne: typeof originalConversationFindOne }
  ).findOne = originalConversationFindOne;
  (
    Conversation as unknown as { create: typeof originalConversationCreate }
  ).create = originalConversationCreate;
  (Message as unknown as { create: typeof originalMessageCreate }).create =
    originalMessageCreate;
  (Message as unknown as { findOne: typeof originalMessageFindOne }).findOne =
    originalMessageFindOne;
  (
    Message as unknown as { updateMany: typeof originalMessageUpdateMany }
  ).updateMany = originalMessageUpdateMany;
});

function stubNoExistingMessage(): void {
  (Message as unknown as { findOne: () => Promise<unknown> }).findOne =
    async () => null;
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

let nextSocketId = 0;

function createSocket(userId: string): {
  socket: Socket;
  emit: <TAck = MessageSendAck>(
    event: string,
    payload: unknown
  ) => Promise<TAck>;
  emitWithoutAck: (event: string, payload: unknown) => void;
} {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  nextSocketId += 1;
  const socket = {
    id: `test-socket-${nextSocketId}`,
    data: { userId },
    on(event: string, handler: (...args: unknown[]) => void) {
      handlers.set(event, handler);
    },
  } as unknown as Socket;

  const emit = <TAck = MessageSendAck>(event: string, payload: unknown) =>
    new Promise<TAck>((resolve) => {
      const handler = handlers.get(event);
      assert.ok(handler, `no handler registered for ${event}`);
      handler(payload, resolve);
    });

  const emitWithoutAck = (event: string, payload: unknown) => {
    const handler = handlers.get(event);
    assert.ok(handler, `no handler registered for ${event}`);
    handler(payload);
  };

  return { socket, emit, emitWithoutAck };
}

type FakeConversation = {
  _id: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  unread: Array<{ user: mongoose.Types.ObjectId; count: number }>;
  lastMessage: mongoose.Types.ObjectId | null;
  lastMessageAt: Date;
  save: () => Promise<void>;
};

function fakeConversation(
  overrides: Partial<FakeConversation> = {}
): FakeConversation {
  return {
    _id: new mongoose.Types.ObjectId(),
    participants: [],
    unread: [],
    lastMessage: null,
    lastMessageAt: new Date(0),
    save: async () => {},
    ...overrides,
  };
}

test('message:send rejects empty content without touching the database', async () => {
  const { io } = createIo();
  const { socket, emit } = createSocket(
    new mongoose.Types.ObjectId().toString()
  );
  registerMessageHandlers(io, socket);

  let findByIdCalled = false;
  (Conversation as unknown as { findById: () => unknown }).findById = () => {
    findByIdCalled = true;
    return null;
  };

  const ack = await emit('message:send', {
    conversationId: 'irrelevant',
    content: '   ',
  });

  assert.equal(ack.ok, false);
  assert.equal(findByIdCalled, false);
});

test('message:send rejects once the per-socket rate limit is exceeded', async () => {
  const { io } = createIo();
  const { socket, emit } = createSocket(
    new mongoose.Types.ObjectId().toString()
  );
  registerMessageHandlers(io, socket);
  resetRateLimit(`message:send:${socket.id}`);

  for (let i = 0; i < MAX_EVENTS; i += 1) {
    const ack = await emit('message:send', { content: '   ' });
    assert.equal(ack.ok, false);
    assert.notEqual(ack.error, 'Too many messages, slow down');
  }

  const limited = await emit('message:send', { content: '   ' });
  assert.equal(limited.ok, false);
  assert.equal(limited.error, 'Too many messages, slow down');
});

test('message:send rejects content over 2000 characters', async () => {
  const { io } = createIo();
  const { socket, emit } = createSocket(
    new mongoose.Types.ObjectId().toString()
  );
  registerMessageHandlers(io, socket);

  const ack = await emit('message:send', {
    conversationId: 'irrelevant',
    content: 'a'.repeat(2001),
  });

  assert.equal(ack.ok, false);
});

test('message:send rejects a conversationId the sender is not a participant of', async () => {
  const { io } = createIo();
  const userId = new mongoose.Types.ObjectId().toString();
  const conversation = fakeConversation({
    participants: [
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
    ],
  });

  (Conversation as unknown as { findById: () => unknown }).findById = () =>
    conversation;

  const { socket, emit } = createSocket(userId);
  registerMessageHandlers(io, socket);

  const ack = await emit('message:send', {
    conversationId: conversation._id.toString(),
    content: 'hello',
    clientId: 'client-6',
  });

  assert.equal(ack.ok, false);
  assert.match(ack.error ?? '', /not a participant/);
});

test('message:send persists, bumps recipient unread, emits to both rooms, and acks ok', async () => {
  const { io, emissions } = createIo();
  const userId = new mongoose.Types.ObjectId();
  const recipientId = new mongoose.Types.ObjectId();
  const conversation = fakeConversation({
    participants: [userId, recipientId],
    unread: [
      { user: userId, count: 0 },
      { user: recipientId, count: 2 },
    ],
  });

  (Conversation as unknown as { findById: () => unknown }).findById = () =>
    conversation;
  stubNoExistingMessage();

  const createdMessage = {
    _id: new mongoose.Types.ObjectId(),
    conversation: conversation._id,
    sender: userId,
    content: 'hello there',
    createdAt: new Date(),
  };
  (Message as unknown as { create: () => Promise<unknown> }).create =
    async () => createdMessage;

  const { socket, emit } = createSocket(userId.toString());
  registerMessageHandlers(io, socket);

  const ack = await emit('message:send', {
    conversationId: conversation._id.toString(),
    content: '  hello there  ',
    clientId: 'client-1',
  });

  assert.equal(ack.ok, true);
  assert.equal(ack.message, createdMessage);

  const unreadEntry = conversation.unread.find(
    (entry) => entry.user === recipientId
  );
  assert.equal(unreadEntry?.count, 3);
  assert.equal(conversation.lastMessage, createdMessage._id);

  const rooms = emissions.map((e) => e.room).sort();
  assert.deepEqual(rooms, [`user:${recipientId}`, `user:${userId}`].sort());
  assert.ok(emissions.every((e) => e.event === 'message:new'));
});

test('message:send forwards images to the created message', async () => {
  const { io } = createIo();
  const userId = new mongoose.Types.ObjectId();
  const conversation = fakeConversation({ participants: [userId] });

  (Conversation as unknown as { findById: () => unknown }).findById = () =>
    conversation;
  stubNoExistingMessage();

  const createCalls: unknown[] = [];
  (Message as unknown as { create: (args: unknown) => Promise<unknown> }).create =
    async (args: unknown) => {
      createCalls.push(args);
      return { _id: new mongoose.Types.ObjectId(), createdAt: new Date() };
    };

  const { socket, emit } = createSocket(userId.toString());
  registerMessageHandlers(io, socket);

  const ack = await emit('message:send', {
    conversationId: conversation._id.toString(),
    content: 'look at this',
    images: ['https://example.com/a.png', 'https://example.com/b.png'],
    clientId: 'client-2',
  });

  assert.equal(ack.ok, true);
  assert.deepEqual((createCalls[0] as { images: string[] }).images, [
    'https://example.com/a.png',
    'https://example.com/b.png',
  ]);
});

test('message:send rejects more than 8 images without touching the database', async () => {
  const { io } = createIo();
  const userId = new mongoose.Types.ObjectId();

  let createCalled = false;
  (Message as unknown as { create: () => Promise<unknown> }).create =
    async () => {
      createCalled = true;
      return {};
    };

  const { socket, emit } = createSocket(userId.toString());
  registerMessageHandlers(io, socket);

  const ack = await emit('message:send', {
    content: 'too many',
    images: Array.from({ length: 9 }, (_, i) => `https://example.com/${i}.png`),
  });

  assert.equal(ack.ok, false);
  assert.match(ack.error ?? '', /at most 8 images/);
  assert.equal(createCalled, false);
});

test('message:send rejects a missing clientId without touching the database', async () => {
  const { io } = createIo();
  const { socket, emit } = createSocket(
    new mongoose.Types.ObjectId().toString()
  );
  registerMessageHandlers(io, socket);

  let findByIdCalled = false;
  (Conversation as unknown as { findById: () => unknown }).findById = () => {
    findByIdCalled = true;
    return null;
  };

  const ack = await emit('message:send', {
    conversationId: 'irrelevant',
    content: 'hello',
  });

  assert.equal(ack.ok, false);
  assert.match(ack.error ?? '', /clientId/);
  assert.equal(findByIdCalled, false);
});

test('message:send is idempotent for a retried clientId and does not bump unread twice', async () => {
  const { io, emissions } = createIo();
  const userId = new mongoose.Types.ObjectId();
  const recipientId = new mongoose.Types.ObjectId();
  const conversation = fakeConversation({
    participants: [userId, recipientId],
    unread: [{ user: recipientId, count: 0 }],
  });

  (Conversation as unknown as { findById: () => unknown }).findById = () =>
    conversation;

  const existingMessage = {
    _id: new mongoose.Types.ObjectId(),
    conversation: conversation._id,
    sender: userId,
    content: 'hello there',
    clientId: 'retry-id',
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

  const { socket, emit } = createSocket(userId.toString());
  registerMessageHandlers(io, socket);

  const ack = await emit('message:send', {
    conversationId: conversation._id.toString(),
    content: 'hello there',
    clientId: 'retry-id',
  });

  assert.equal(ack.ok, true);
  assert.equal(ack.message, existingMessage);
  assert.equal(createCalled, false);
  assert.equal(
    conversation.unread.find((entry) => entry.user === recipientId)?.count,
    0
  );
  assert.equal(emissions.length, 0);
});

test('message:send recovers from a duplicate-key race by returning the winner', async () => {
  const { io } = createIo();
  const userId = new mongoose.Types.ObjectId();
  const conversation = fakeConversation({ participants: [userId] });

  (Conversation as unknown as { findById: () => unknown }).findById = () =>
    conversation;

  const winnerMessage = {
    _id: new mongoose.Types.ObjectId(),
    conversation: conversation._id,
    sender: userId,
    content: 'hello',
    clientId: 'race-id',
    createdAt: new Date(),
  };

  let findOneCalls = 0;
  (Message as unknown as { findOne: () => Promise<unknown> }).findOne =
    async () => {
      findOneCalls += 1;
      return findOneCalls === 1 ? null : winnerMessage;
    };
  (Message as unknown as { create: () => Promise<unknown> }).create =
    async () => {
      const error = new Error('duplicate key') as Error & { code: number };
      error.code = 11000;
      throw error;
    };

  const { socket, emit } = createSocket(userId.toString());
  registerMessageHandlers(io, socket);

  const ack = await emit('message:send', {
    conversationId: conversation._id.toString(),
    content: 'hello',
    clientId: 'race-id',
  });

  assert.equal(ack.ok, true);
  assert.equal(ack.message, winnerMessage);
});

test('message:send acks an error when the conversation cannot be resolved', async () => {
  const { io } = createIo();
  const { socket, emit } = createSocket(
    new mongoose.Types.ObjectId().toString()
  );
  registerMessageHandlers(io, socket);

  const ack = await emit('message:send', {
    content: 'hello',
    clientId: 'client-5',
  });

  assert.equal(ack.ok, false);
  assert.match(ack.error ?? '', /not found or recipient invalid/);
});

test('message:send acks an internal error when persistence throws', async () => {
  const { io } = createIo();
  const userId = new mongoose.Types.ObjectId();
  const conversation = fakeConversation({
    participants: [userId, new mongoose.Types.ObjectId()],
  });

  (Conversation as unknown as { findById: () => unknown }).findById = () =>
    conversation;
  stubNoExistingMessage();
  (Message as unknown as { create: () => Promise<unknown> }).create =
    async () => {
      throw new Error('db unavailable');
    };

  const { socket, emit } = createSocket(userId.toString());
  registerMessageHandlers(io, socket);

  const ack = await emit('message:send', {
    conversationId: conversation._id.toString(),
    content: 'hello',
    clientId: 'client-err',
  });

  assert.equal(ack.ok, false);
  assert.equal(ack.error, 'Internal server error');
});

test('message:send works without an ack callback', async () => {
  const { io } = createIo();
  const { socket, emitWithoutAck } = createSocket(
    new mongoose.Types.ObjectId().toString()
  );
  registerMessageHandlers(io, socket);

  assert.doesNotThrow(() => {
    emitWithoutAck('message:send', { content: 'no ack here' });
  });
});

test('message:send reuses an existing conversation found via recipientId', async () => {
  const { io } = createIo();
  const userId = new mongoose.Types.ObjectId();
  const recipientId = new mongoose.Types.ObjectId();
  const existing = fakeConversation({ participants: [userId, recipientId] });

  (Conversation as unknown as { findOne: () => Promise<unknown> }).findOne =
    async () => existing;
  stubNoExistingMessage();

  const createdMessage = {
    _id: new mongoose.Types.ObjectId(),
    conversation: existing._id,
    sender: userId,
    content: 'hi',
    createdAt: new Date(),
  };
  (Message as unknown as { create: () => Promise<unknown> }).create =
    async () => createdMessage;

  const { socket, emit } = createSocket(userId.toString());
  registerMessageHandlers(io, socket);

  const ack = await emit('message:send', {
    recipientId: recipientId.toString(),
    content: 'hi',
    clientId: 'client-3',
  });

  assert.equal(ack.ok, true);
  assert.equal(ack.conversation, existing);
});

test('message:send get-or-creates a conversation via recipientId', async () => {
  const { io } = createIo();
  const userId = new mongoose.Types.ObjectId();
  const recipientId = new mongoose.Types.ObjectId();

  (Conversation as unknown as { findOne: () => Promise<unknown> }).findOne =
    async () => null;

  stubNoExistingMessage();
  let createArgs: unknown;
  const created = fakeConversation({ participants: [userId, recipientId] });
  (
    Conversation as unknown as { create: (args: unknown) => Promise<unknown> }
  ).create = async (args) => {
    createArgs = args;
    return created;
  };

  const createdMessage = {
    _id: new mongoose.Types.ObjectId(),
    conversation: created._id,
    sender: userId,
    content: 'hi',
    createdAt: new Date(),
  };
  (Message as unknown as { create: () => Promise<unknown> }).create =
    async () => createdMessage;

  const { socket, emit } = createSocket(userId.toString());
  registerMessageHandlers(io, socket);

  const ack = await emit('message:send', {
    recipientId: recipientId.toString(),
    content: 'hi',
    clientId: 'client-4',
  });

  assert.equal(ack.ok, true);
  assert.ok(createArgs);
});

test('message:read rejects an invalid conversationId', async () => {
  const { io } = createIo();
  const { socket, emit } = createSocket(
    new mongoose.Types.ObjectId().toString()
  );
  registerMessageHandlers(io, socket);

  const ack = await emit<MessageReadAck>('message:read', {
    conversationId: 'not-an-id',
  });

  assert.equal(ack.ok, false);
});

test('message:read rejects a conversation the user is not a participant of', async () => {
  const { io } = createIo();
  const conversation = fakeConversation({
    participants: [
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
    ],
  });

  (Conversation as unknown as { findById: () => unknown }).findById = () =>
    conversation;

  const { socket, emit } = createSocket(
    new mongoose.Types.ObjectId().toString()
  );
  registerMessageHandlers(io, socket);

  const ack = await emit<MessageReadAck>('message:read', {
    conversationId: conversation._id.toString(),
  });

  assert.equal(ack.ok, false);
  assert.match(ack.error ?? '', /not a participant/);
});

test('message:read resets unread, marks messages read, and notifies the other participant', async () => {
  const { io, emissions } = createIo();
  const userId = new mongoose.Types.ObjectId();
  const recipientId = new mongoose.Types.ObjectId();
  const conversation = fakeConversation({
    participants: [userId, recipientId],
    unread: [
      { user: userId, count: 3 },
      { user: recipientId, count: 0 },
    ],
  });

  (Conversation as unknown as { findById: () => unknown }).findById = () =>
    conversation;

  let updateManyFilter: unknown;
  (
    Message as unknown as {
      updateMany: (filter: unknown, update: unknown) => Promise<unknown>;
    }
  ).updateMany = async (filter) => {
    updateManyFilter = filter;
    return { acknowledged: true };
  };

  const { socket, emit } = createSocket(userId.toString());
  registerMessageHandlers(io, socket);

  const ack = await emit<MessageReadAck>('message:read', {
    conversationId: conversation._id.toString(),
  });

  assert.equal(ack.ok, true);

  const unreadEntry = conversation.unread.find(
    (entry) => entry.user === userId
  );
  assert.equal(unreadEntry?.count, 0);
  assert.ok(updateManyFilter);

  assert.equal(emissions.length, 1);
  assert.equal(emissions[0].room, `user:${recipientId}`);
  assert.equal(emissions[0].event, 'message:read');
  assert.deepEqual(emissions[0].payload, {
    conversationId: conversation._id.toString(),
    userId: userId.toString(),
    readAt: (emissions[0].payload as { readAt: string }).readAt,
  });
});

test('message:read rejects a missing conversationId without touching the database', async () => {
  const { io } = createIo();
  const { socket, emit } = createSocket(
    new mongoose.Types.ObjectId().toString()
  );
  registerMessageHandlers(io, socket);

  let findByIdCalled = false;
  (Conversation as unknown as { findById: () => unknown }).findById = () => {
    findByIdCalled = true;
    return null;
  };

  const ack = await emit<MessageReadAck>('message:read', {});

  assert.equal(ack.ok, false);
  assert.equal(findByIdCalled, false);
});

test('message:read acks an error when the conversation is not found', async () => {
  const { io } = createIo();
  (Conversation as unknown as { findById: () => unknown }).findById = () =>
    null;

  const { socket, emit } = createSocket(
    new mongoose.Types.ObjectId().toString()
  );
  registerMessageHandlers(io, socket);

  const ack = await emit<MessageReadAck>('message:read', {
    conversationId: new mongoose.Types.ObjectId().toString(),
  });

  assert.equal(ack.ok, false);
  assert.equal(ack.error, 'Conversation not found');
});

test('message:read works without an ack callback', async () => {
  const { io } = createIo();
  const { socket, emitWithoutAck } = createSocket(
    new mongoose.Types.ObjectId().toString()
  );
  registerMessageHandlers(io, socket);

  assert.doesNotThrow(() => {
    emitWithoutAck('message:read', { conversationId: 'not-an-id' });
  });
});

test('message:read acks an internal error when persistence throws', async () => {
  const { io } = createIo();
  const userId = new mongoose.Types.ObjectId();
  const conversation = fakeConversation({
    participants: [userId, new mongoose.Types.ObjectId()],
    unread: [{ user: userId, count: 2 }],
  });

  (Conversation as unknown as { findById: () => unknown }).findById = () =>
    conversation;
  (Message as unknown as { updateMany: () => Promise<unknown> }).updateMany =
    async () => {
      throw new Error('db unavailable');
    };

  const { socket, emit } = createSocket(userId.toString());
  registerMessageHandlers(io, socket);

  const ack = await emit<MessageReadAck>('message:read', {
    conversationId: conversation._id.toString(),
  });

  assert.equal(ack.ok, false);
  assert.equal(ack.error, 'Internal server error');
});
