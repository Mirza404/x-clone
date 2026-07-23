import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { socketAuthMiddleware } from './auth';

const SECRET = 'test-secret';
const originalSecret = process.env.BACKEND_JWT_SECRET;

before(() => {
  process.env.BACKEND_JWT_SECRET = SECRET;
});

after(() => {
  process.env.BACKEND_JWT_SECRET = originalSecret;
});

function createSocket(token?: unknown): Socket {
  return {
    handshake: { auth: { token } },
    data: {},
  } as unknown as Socket;
}

function signToken(overrides: Partial<jwt.SignOptions> = {}, secret = SECRET) {
  return jwt.sign({ sub: 'user-123' }, secret, {
    issuer: 'x-clone-frontend',
    audience: 'x-clone-backend',
    expiresIn: '5m',
    ...overrides,
  });
}

test('socketAuthMiddleware rejects a handshake with no token', () => {
  const socket = createSocket(undefined);
  let error: Error | undefined;

  socketAuthMiddleware(socket, (err) => {
    error = err;
  });

  assert.ok(error);
});

test('socketAuthMiddleware rejects a garbage token', () => {
  const socket = createSocket('not-a-real-token');
  let error: Error | undefined;

  socketAuthMiddleware(socket, (err) => {
    error = err;
  });

  assert.ok(error);
});

test('socketAuthMiddleware rejects a token signed with the wrong secret', () => {
  const socket = createSocket(signToken({}, 'wrong-secret'));
  let error: Error | undefined;

  socketAuthMiddleware(socket, (err) => {
    error = err;
  });

  assert.ok(error);
});

test('socketAuthMiddleware accepts a valid token and sets socket.data.userId', () => {
  const socket = createSocket(signToken());
  let error: Error | undefined;

  socketAuthMiddleware(socket, (err) => {
    error = err;
  });

  assert.equal(error, undefined);
  assert.equal(socket.data.userId, 'user-123');
});
