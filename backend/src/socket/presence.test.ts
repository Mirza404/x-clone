import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import { addSocket, removeSocket, isOnline } from './presence';

function uniqueId(): string {
  return crypto.randomUUID();
}

test('a user is offline until their first socket connects', () => {
  const userId = uniqueId();
  assert.equal(isOnline(userId), false);
});

test('addSocket marks a user online on their first socket', () => {
  const userId = uniqueId();
  const transition = addSocket(userId, uniqueId());

  assert.equal(transition, 'came-online');
  assert.equal(isOnline(userId), true);
});

test('addSocket for a second socket of an already-online user is a no-op transition', () => {
  const userId = uniqueId();
  addSocket(userId, uniqueId());

  const transition = addSocket(userId, uniqueId());

  assert.equal(transition, 'no-change');
  assert.equal(isOnline(userId), true);
});

test('removeSocket keeps a user online while another socket remains (multi-tab)', () => {
  const userId = uniqueId();
  const socketA = uniqueId();
  const socketB = uniqueId();
  addSocket(userId, socketA);
  addSocket(userId, socketB);

  const transition = removeSocket(userId, socketA);

  assert.equal(transition, 'no-change');
  assert.equal(isOnline(userId), true);
});

test('removeSocket marks a user offline once their last socket disconnects', () => {
  const userId = uniqueId();
  const socketId = uniqueId();
  addSocket(userId, socketId);

  const transition = removeSocket(userId, socketId);

  assert.equal(transition, 'went-offline');
  assert.equal(isOnline(userId), false);
});

test('removeSocket for a user with no tracked sockets is a no-op', () => {
  const userId = uniqueId();

  const transition = removeSocket(userId, uniqueId());

  assert.equal(transition, 'no-change');
  assert.equal(isOnline(userId), false);
});
