import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import mongoose from 'mongoose';
import { Server, Socket } from 'socket.io';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import { registerMessageHandlers } from './handlers';

type MessageSendAck = {
  ok: boolean;
  message?: unknown;
  conversation?: unknown;
  error?: string;
};

type Emission = { room: string; event: string; payload: unknown };

const originalConversationFindById = Conversation.findById;
const originalConversationFindOne = Conversation.findOne;
const originalConversationCreate = Conversation.create;
const originalMessageCreate = Message.create;

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
});

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

function createSocket(userId: string): {
  socket: Socket;
  emit: (event: string, payload: unknown) => Promise<MessageSendAck>;
} {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  const socket = {
    data: { userId },
    on(event: string, handler: (...args: unknown[]) => void) {
      handlers.set(event, handler);
    },
  } as unknown as Socket;

  const emit = (event: string, payload: unknown) =>
    new Promise<MessageSendAck>((resolve) => {
      const handler = handlers.get(event);
      assert.ok(handler, `no handler registered for ${event}`);
      handler(payload, resolve);
    });

  return { socket, emit };
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
  const { socket, emit } = createSocket(new mongoose.Types.ObjectId().toString());
  registerMessageHandlers(io, socket);

  let findByIdCalled = false;
  (Conversation as unknown as { findById: () => unknown }).findById = () => {
    findByIdCalled = true;
    return null;
  };

  const ack = await emit('message:send', { conversationId: 'irrelevant', content: '   ' });

  assert.equal(ack.ok, false);
  assert.equal(findByIdCalled, false);
});

test('message:send rejects content over 2000 characters', async () => {
  const { io } = createIo();
  const { socket, emit } = createSocket(new mongoose.Types.ObjectId().toString());
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
    participants: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
  });

  (Conversation as unknown as { findById: () => unknown }).findById = () =>
    conversation;

  const { socket, emit } = createSocket(userId);
  registerMessageHandlers(io, socket);

  const ack = await emit('message:send', {
    conversationId: conversation._id.toString(),
    content: 'hello',
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

test('message:send get-or-creates a conversation via recipientId', async () => {
  const { io } = createIo();
  const userId = new mongoose.Types.ObjectId();
  const recipientId = new mongoose.Types.ObjectId();

  (Conversation as unknown as { findOne: () => Promise<unknown> }).findOne =
    async () => null;

  let createArgs: unknown;
  const created = fakeConversation({ participants: [userId, recipientId] });
  (Conversation as unknown as { create: (args: unknown) => Promise<unknown> }).create =
    async (args) => {
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
  });

  assert.equal(ack.ok, true);
  assert.ok(createArgs);
});
