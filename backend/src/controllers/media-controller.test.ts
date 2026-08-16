import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { Request, Response } from 'express';
import { MediaValidationError, mediaService } from '../services/media-service';
import { completeUpload, createUploadSignature } from './media-controller';

type MockResponse = Response & {
  statusCode?: number;
  body?: unknown;
};

const originalCreateUploadSignature = mediaService.createUploadSignature;
const originalCompleteUpload = mediaService.completeUpload;
const originalConsoleError = console.error;

function createResponse(): MockResponse {
  return {
    status(this: MockResponse, code: number) {
      this.statusCode = code;
      return this;
    },
    json(this: MockResponse, body: unknown) {
      this.body = body;
      return this;
    },
  } as MockResponse;
}

function createRequest(userId?: string, body: Record<string, unknown> = {}) {
  return { userId, body } as Request;
}

afterEach(() => {
  mediaService.createUploadSignature = originalCreateUploadSignature;
  mediaService.completeUpload = originalCompleteUpload;
  console.error = originalConsoleError;
});

test('media endpoints reject unauthenticated requests defensively', async () => {
  const signatureResponse = createResponse();
  const completionResponse = createResponse();

  await createUploadSignature(createRequest(), signatureResponse);
  await completeUpload(createRequest(), completionResponse);

  assert.equal(signatureResponse.statusCode, 401);
  assert.equal(completionResponse.statusCode, 401);
});

test('createUploadSignature returns the service payload', async () => {
  const payload = { signature: 'signed' };
  mediaService.createUploadSignature = async () =>
    payload as Awaited<ReturnType<typeof originalCreateUploadSignature>>;
  const response = createResponse();

  await createUploadSignature(createRequest('user-id'), response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body, payload);
});

test('completeUpload returns the registered canonical URL', async () => {
  mediaService.completeUpload = async () => ({ secureUrl: 'verified-url' });
  const response = createResponse();

  await completeUpload(
    createRequest('user-id', { publicId: 'asset' }),
    response
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { secureUrl: 'verified-url' });
});

test('completeUpload exposes safe media validation messages as 400', async () => {
  mediaService.completeUpload = async () => {
    throw new MediaValidationError('Invalid image URL');
  };
  const response = createResponse();

  await completeUpload(createRequest('user-id'), response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { message: 'Invalid image URL' });
});

test('media endpoints hide unexpected errors', async () => {
  mediaService.createUploadSignature = async () => {
    throw new Error('sensitive details');
  };
  console.error = () => undefined;
  const response = createResponse();

  await createUploadSignature(createRequest('user-id'), response);

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, { message: 'Internal server error' });
});
