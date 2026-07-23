import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import Message from './Message';

test('message model accepts a minimal valid message', () => {
  const message = new Message({
    conversation: new mongoose.Types.ObjectId(),
    sender: new mongoose.Types.ObjectId(),
    content: 'hey there',
  });

  assert.equal(message.validateSync(), undefined);
  assert.deepEqual(message.readBy, []);
  assert.deepEqual(message.deliveredTo, []);
});

test('message model requires conversation, sender, and content', () => {
  const message = new Message({});
  const error = message.validateSync();

  assert.ok(error);
  assert.ok(error.errors.conversation);
  assert.ok(error.errors.sender);
  assert.ok(error.errors.content);
});

test('message model rejects content longer than 2000 characters', () => {
  const message = new Message({
    conversation: new mongoose.Types.ObjectId(),
    sender: new mongoose.Types.ObjectId(),
    content: 'x'.repeat(2001),
  });
  const error = message.validateSync();

  assert.ok(error);
  assert.ok(error.errors.content);
});

test('message model rejects empty content', () => {
  const message = new Message({
    conversation: new mongoose.Types.ObjectId(),
    sender: new mongoose.Types.ObjectId(),
    content: '',
  });
  const error = message.validateSync();

  assert.ok(error);
  assert.ok(error.errors.content);
});
