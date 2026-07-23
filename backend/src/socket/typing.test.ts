import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import mongoose from 'mongoose';
import { Server, Socket } from 'socket.io';
import Conversation from '../models/Conversation';
import { registerTypingHandlers } from './typing';

type Emission = { room: string; event: string; payload: unknown };

const originalConversationFindById = Conversation.findById;

afterEach(() => {
  (
    Conversation as unknown as { findById: typeof originalConversationFindById }
  ).findById = originalConversationFindById;
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
  trigger: (event: string, payload: unknown) => void;
} {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  const socket = {
    data: { userId },
    on(event: string, handler: (...args: unknown[]) => void) {
      handlers.set(event, handler);
    },
  } as unknown as Socket;

  const trigger = (event: string, payload: unknown) => {
    const handler = handlers.get(event);
    assert.ok(handler, `no handler registered for ${event}`);
    handler(payload);
  };

  return { socket, trigger };
}

type FakeConversation = {
  _id: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
};

function fakeConversation(
  overrides: Partial<FakeConversation> = {}
): FakeConversation {
  return {
    _id: new mongoose.Types.ObjectId(),
    participants: [],
    ...overrides,
  };
}

// Give the fire-and-forget async handler a tick to run before assertions.
function flush(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

test('typing:start relays typing=true to the other participant only', async () => {
  const { io, emissions } = createIo();
  const userId = new mongoose.Types.ObjectId();
  const recipientId = new mongoose.Types.ObjectId();
  const conversation = fakeConversation({
    participants: [userId, recipientId],
  });

  (Conversation as unknown as { findById: () => unknown }).findById = () =>
    conversation;

  const { socket, trigger } = createSocket(userId.toString());
  registerTypingHandlers(io, socket);

  trigger('typing:start', { conversationId: conversation._id.toString() });
  await flush();

  assert.equal(emissions.length, 1);
  assert.equal(emissions[0].room, `user:${recipientId}`);
  assert.equal(emissions[0].event, 'typing');
  assert.deepEqual(emissions[0].payload, {
    conversationId: conversation._id.toString(),
    userId: userId.toString(),
    isTyping: true,
  });
});

test('typing:stop relays typing=false to the other participant', async () => {
  const { io, emissions } = createIo();
  const userId = new mongoose.Types.ObjectId();
  const recipientId = new mongoose.Types.ObjectId();
  const conversation = fakeConversation({
    participants: [userId, recipientId],
  });

  (Conversation as unknown as { findById: () => unknown }).findById = () =>
    conversation;

  const { socket, trigger } = createSocket(userId.toString());
  registerTypingHandlers(io, socket);

  trigger('typing:stop', { conversationId: conversation._id.toString() });
  await flush();

  assert.equal(emissions.length, 1);
  assert.deepEqual(emissions[0].payload, {
    conversationId: conversation._id.toString(),
    userId: userId.toString(),
    isTyping: false,
  });
});

test('typing:start is ignored for an invalid conversationId', async () => {
  const { io, emissions } = createIo();
  let findByIdCalled = false;
  (Conversation as unknown as { findById: () => unknown }).findById = () => {
    findByIdCalled = true;
    return null;
  };

  const { socket, trigger } = createSocket(
    new mongoose.Types.ObjectId().toString()
  );
  registerTypingHandlers(io, socket);

  trigger('typing:start', { conversationId: 'not-an-id' });
  await flush();

  assert.equal(findByIdCalled, false);
  assert.equal(emissions.length, 0);
});

test('typing:start is ignored when the conversation is not found', async () => {
  const { io, emissions } = createIo();
  (Conversation as unknown as { findById: () => unknown }).findById = () =>
    null;

  const { socket, trigger } = createSocket(
    new mongoose.Types.ObjectId().toString()
  );
  registerTypingHandlers(io, socket);

  trigger('typing:start', {
    conversationId: new mongoose.Types.ObjectId().toString(),
  });
  await flush();

  assert.equal(emissions.length, 0);
});

test('typing:start is ignored when the sender is not a participant', async () => {
  const { io, emissions } = createIo();
  const conversation = fakeConversation({
    participants: [
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
    ],
  });

  (Conversation as unknown as { findById: () => unknown }).findById = () =>
    conversation;

  const { socket, trigger } = createSocket(
    new mongoose.Types.ObjectId().toString()
  );
  registerTypingHandlers(io, socket);

  trigger('typing:start', { conversationId: conversation._id.toString() });
  await flush();

  assert.equal(emissions.length, 0);
});

test('typing:start is ignored when the payload has no conversationId', async () => {
  const { io, emissions } = createIo();
  let findByIdCalled = false;
  (Conversation as unknown as { findById: () => unknown }).findById = () => {
    findByIdCalled = true;
    return null;
  };

  const { socket, trigger } = createSocket(
    new mongoose.Types.ObjectId().toString()
  );
  registerTypingHandlers(io, socket);

  trigger('typing:start', {});
  await flush();

  assert.equal(findByIdCalled, false);
  assert.equal(emissions.length, 0);
});
