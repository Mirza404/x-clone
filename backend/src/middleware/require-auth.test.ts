import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { requireAuth } from './require-auth';

const SECRET = 'test-secret';
const originalSecret = process.env.BACKEND_JWT_SECRET;

before(() => {
  process.env.BACKEND_JWT_SECRET = SECRET;
});

after(() => {
  process.env.BACKEND_JWT_SECRET = originalSecret;
});

type MockResponse = Response & {
  statusCode?: number;
  body?: unknown;
};

function createResponse(): MockResponse {
  const response: MockResponse = {
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

function createRequest(authorization?: string): Request {
  return { headers: { authorization } } as unknown as Request;
}

function signToken(overrides: Partial<jwt.SignOptions> = {}, secret = SECRET) {
  return jwt.sign({ sub: 'user-123' }, secret, {
    issuer: 'x-clone-frontend',
    audience: 'x-clone-backend',
    expiresIn: '5m',
    ...overrides,
  });
}

test('requireAuth returns 401 when no Authorization header is present', () => {
  const req = createRequest(undefined);
  const res = createResponse();
  let nextCalled = false;

  requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { message: 'Authentication required' });
});

test('requireAuth returns 401 for a garbage token', () => {
  const req = createRequest('Bearer not-a-real-token');
  const res = createResponse();
  let nextCalled = false;

  requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test('requireAuth returns 401 for a token signed with the wrong secret', () => {
  const token = signToken({}, 'wrong-secret');
  const req = createRequest(`Bearer ${token}`);
  const res = createResponse();
  let nextCalled = false;

  requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test('requireAuth returns 401 for an expired token', () => {
  const token = signToken({ expiresIn: '-1s' });
  const req = createRequest(`Bearer ${token}`);
  const res = createResponse();
  let nextCalled = false;

  requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test('requireAuth calls next and sets req.userId for a valid token', () => {
  const token = signToken();
  const req = createRequest(`Bearer ${token}`);
  const res = createResponse();
  let nextCalled = false;

  requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.userId, 'user-123');
  assert.equal(res.statusCode, undefined);
});
