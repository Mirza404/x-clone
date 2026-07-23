import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import Conversation, { participantsKey } from './Conversation';

test('conversation model accepts exactly 2 participants', () => {
  const a = new mongoose.Types.ObjectId();
  const b = new mongoose.Types.ObjectId();
  const conversation = new Conversation({
    participants: [a, b],
    participantsKey: participantsKey(a, b),
  });

  assert.equal(conversation.validateSync(), undefined);
  assert.deepEqual(conversation.unread, []);
});

test('conversation model rejects a participant count other than 2', () => {
  const a = new mongoose.Types.ObjectId();
  const conversation = new Conversation({
    participants: [a],
    participantsKey: 'irrelevant',
  });
  const error = conversation.validateSync();

  assert.ok(error);
  assert.ok(error.errors.participants);
});

test('conversation model requires participantsKey', () => {
  const a = new mongoose.Types.ObjectId();
  const b = new mongoose.Types.ObjectId();
  const conversation = new Conversation({ participants: [a, b] });
  const error = conversation.validateSync();

  assert.ok(error);
  assert.ok(error.errors.participantsKey);
});

test('participantsKey is order-independent', () => {
  const a = new mongoose.Types.ObjectId();
  const b = new mongoose.Types.ObjectId();

  assert.equal(participantsKey(a, b), participantsKey(b, a));
});
