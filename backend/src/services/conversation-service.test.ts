import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import mongoose from 'mongoose';
import Conversation, { participantsKey } from '../models/Conversation';
import { getOrCreateConversation } from './conversation-service';

const originalDbDescriptor = Object.getOwnPropertyDescriptor(
  mongoose.connection,
  'db'
);
const originalFindOne = Conversation.findOne;
const originalFindOneAndUpdate = Conversation.findOneAndUpdate;

function setRecipient(recipient: Record<string, unknown> | null): void {
  Object.defineProperty(mongoose.connection, 'db', {
    configurable: true,
    get: () => ({
      collection: () => ({
        findOne: async () => recipient,
      }),
    }),
  });
}

afterEach(() => {
  if (originalDbDescriptor) {
    Object.defineProperty(mongoose.connection, 'db', originalDbDescriptor);
  }
  (Conversation as unknown as { findOne: typeof originalFindOne }).findOne =
    originalFindOne;
  (
    Conversation as unknown as {
      findOneAndUpdate: typeof originalFindOneAndUpdate;
    }
  ).findOneAndUpdate = originalFindOneAndUpdate;
});

test('getOrCreateConversation rejects a nonexistent recipient before upserting', async () => {
  setRecipient(null);
  let upsertCalled = false;
  (
    Conversation as unknown as { findOneAndUpdate: () => Promise<unknown> }
  ).findOneAndUpdate = async () => {
    upsertCalled = true;
    return null;
  };

  const result = await getOrCreateConversation(
    new mongoose.Types.ObjectId().toString(),
    new mongoose.Types.ObjectId().toString()
  );

  assert.equal(result, null);
  assert.equal(upsertCalled, false);
});

test('getOrCreateConversation atomically upserts the canonical participant pair', async () => {
  const userId = new mongoose.Types.ObjectId();
  const recipientId = new mongoose.Types.ObjectId();
  const conversation = { _id: new mongoose.Types.ObjectId() };
  setRecipient({ _id: recipientId });

  let call:
    | { filter: unknown; update: unknown; options: Record<string, unknown> }
    | undefined;
  (
    Conversation as unknown as {
      findOneAndUpdate: (
        filter: unknown,
        update: unknown,
        options: Record<string, unknown>
      ) => Promise<unknown>;
    }
  ).findOneAndUpdate = async (filter, update, options) => {
    call = { filter, update, options };
    return conversation;
  };

  const result = await getOrCreateConversation(
    userId.toString(),
    recipientId.toString()
  );

  assert.equal(result, conversation);
  assert.deepEqual(call?.filter, {
    participantsKey: participantsKey(userId, recipientId),
  });
  assert.equal(call?.options.upsert, true);
  assert.equal(call?.options.new, true);
  assert.ok((call?.update as { $setOnInsert?: unknown }).$setOnInsert);
});

test('getOrCreateConversation returns the winner of a duplicate-key race', async () => {
  const userId = new mongoose.Types.ObjectId();
  const recipientId = new mongoose.Types.ObjectId();
  const winner = { _id: new mongoose.Types.ObjectId() };
  setRecipient({ _id: recipientId });

  let upsertCalls = 0;
  (
    Conversation as unknown as { findOneAndUpdate: () => Promise<unknown> }
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

  const results = await Promise.all([
    getOrCreateConversation(userId.toString(), recipientId.toString()),
    getOrCreateConversation(userId.toString(), recipientId.toString()),
  ]);

  assert.deepEqual(results, [winner, winner]);
});
