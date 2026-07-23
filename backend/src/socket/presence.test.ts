import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import Conversation from '../models/Conversation';
import {
  addSocket,
  removeSocket,
  isOnline,
  broadcastPresenceChange,
  sendCurrentPresenceTo,
} from './presence';

function uniqueId(): string {
  return crypto.randomUUID();
}

const originalConversationFind = Conversation.find;

afterEach(() => {
  (Conversation as unknown as { find: typeof originalConversationFind }).find =
    originalConversationFind;
});

type Emission = { room: string; event: string; payload: unknown };

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

function mockConversationsFor(
  userId: mongoose.Types.ObjectId,
  partnerIds: mongoose.Types.ObjectId[]
): void {
  (
    Conversation as unknown as {
      find: () => { select: () => { lean: () => Promise<unknown> } };
    }
  ).find = () => ({
    select: () => ({
      lean: async () =>
        partnerIds.map((partnerId) => ({
          participants: [userId, partnerId],
        })),
    }),
  });
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

test('broadcastPresenceChange emits presence to every conversation partner', async () => {
  const { io, emissions } = createIo();
  const userId = new mongoose.Types.ObjectId();
  const partnerA = new mongoose.Types.ObjectId();
  const partnerB = new mongoose.Types.ObjectId();
  mockConversationsFor(userId, [partnerA, partnerB]);

  await broadcastPresenceChange(io, userId.toString(), true);

  const rooms = emissions.map((e) => e.room).sort();
  assert.deepEqual(rooms, [`user:${partnerA}`, `user:${partnerB}`].sort());
  assert.ok(emissions.every((e) => e.event === 'presence'));
  assert.ok(
    emissions.every(
      (e) =>
        (e.payload as { userId: string; online: boolean }).userId ===
          userId.toString() &&
        (e.payload as { userId: string; online: boolean }).online === true
    )
  );
});

test('broadcastPresenceChange emits nothing when the user has no conversations', async () => {
  const { io, emissions } = createIo();
  const userId = new mongoose.Types.ObjectId();
  mockConversationsFor(userId, []);

  await broadcastPresenceChange(io, userId.toString(), false);

  assert.equal(emissions.length, 0);
});

test('sendCurrentPresenceTo tells a newly connected socket about online partners only', async () => {
  const { io, emissions } = createIo();
  const userId = new mongoose.Types.ObjectId();
  const onlinePartner = new mongoose.Types.ObjectId();
  const offlinePartner = new mongoose.Types.ObjectId();
  mockConversationsFor(userId, [onlinePartner, offlinePartner]);
  addSocket(onlinePartner.toString(), uniqueId());

  await sendCurrentPresenceTo(io, 'socket-1', userId.toString());

  assert.equal(emissions.length, 1);
  assert.equal(emissions[0].room, 'socket-1');
  assert.deepEqual(emissions[0].payload, {
    userId: onlinePartner.toString(),
    online: true,
  });
});

test('sendCurrentPresenceTo emits nothing when no partners are online', async () => {
  const { io, emissions } = createIo();
  const userId = new mongoose.Types.ObjectId();
  const offlinePartner = new mongoose.Types.ObjectId();
  mockConversationsFor(userId, [offlinePartner]);

  await sendCurrentPresenceTo(io, 'socket-1', userId.toString());

  assert.equal(emissions.length, 0);
});
