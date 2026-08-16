import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import MediaAsset from '../models/MediaAsset';
import {
  MAX_IMAGE_BYTES,
  MediaValidationError,
  SIGNED_UPLOAD_PRESET,
  mediaService,
} from './media-service';

const TEST_CLOUD_NAME = 'test-cloud';
const TEST_API_KEY = 'test-key';
const TEST_API_SECRET = 'test-secret';
const originalEnv = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
  allowUnregistered: process.env.MEDIA_ALLOW_UNREGISTERED_CLOUDINARY,
};
const originalResource = cloudinary.api.resource;
const originalDestroy = cloudinary.uploader.destroy;
const originalFind = MediaAsset.find;
const originalFindOneAndUpdate = MediaAsset.findOneAndUpdate;

function setTestEnv(): void {
  process.env.CLOUDINARY_CLOUD_NAME = TEST_CLOUD_NAME;
  process.env.CLOUDINARY_API_KEY = TEST_API_KEY;
  process.env.CLOUDINARY_API_SECRET = TEST_API_SECRET;
}

function restoreEnv(): void {
  const entries = [
    ['CLOUDINARY_CLOUD_NAME', originalEnv.cloudName],
    ['CLOUDINARY_API_KEY', originalEnv.apiKey],
    ['CLOUDINARY_API_SECRET', originalEnv.apiSecret],
    ['MEDIA_ALLOW_UNREGISTERED_CLOUDINARY', originalEnv.allowUnregistered],
  ] as const;

  for (const [key, value] of entries) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function fixture() {
  const userId = new mongoose.Types.ObjectId().toString();
  const publicId = `x_clone/users/${userId}/123e4567-e89b-42d3-a456-426614174000`;
  const version = 123456;
  const format = 'png';
  const secureUrl = `https://res.cloudinary.com/${TEST_CLOUD_NAME}/image/upload/v${version}/${publicId}.${format}`;
  const signature = cloudinary.utils.api_sign_request(
    { public_id: publicId, version },
    TEST_API_SECRET
  );

  return { userId, publicId, version, format, secureUrl, signature };
}

function mockResource(
  resource: Record<string, unknown>,
  onCall?: (publicId: string, options: unknown) => void
): void {
  cloudinary.api.resource = (async (publicId: string, options?: unknown) => {
    onCall?.(publicId, options);
    return resource;
  }) as typeof cloudinary.api.resource;
}

function mockOwnedUrls(urls: string[], owner?: string): void {
  (MediaAsset as unknown as { find: (filter: unknown) => unknown }).find =
    () => ({
      select: () => ({
        lean: async () => urls.map((secureUrl) => ({ secureUrl, owner })),
      }),
    });
}

beforeEach(() => {
  setTestEnv();
});

afterEach(() => {
  restoreEnv();
  cloudinary.api.resource = originalResource;
  cloudinary.uploader.destroy = originalDestroy;
  (MediaAsset as unknown as { find: typeof originalFind }).find = originalFind;
  (
    MediaAsset as unknown as {
      findOneAndUpdate: typeof originalFindOneAndUpdate;
    }
  ).findOneAndUpdate = originalFindOneAndUpdate;
});

test('createUploadSignature signs only the server-controlled upload fields', async () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const result = await mediaService.createUploadSignature(userId);

  assert.equal(result.cloudName, TEST_CLOUD_NAME);
  assert.equal(result.apiKey, TEST_API_KEY);
  assert.equal(
    result.uploadUrl,
    `https://api.cloudinary.com/v1_1/${TEST_CLOUD_NAME}/image/upload`
  );
  assert.equal(result.uploadPreset, SIGNED_UPLOAD_PRESET);
  assert.match(
    result.publicId,
    new RegExp(`^x_clone/users/${userId}/[0-9a-f-]{36}$`, 'i')
  );
  assert.deepEqual(result.params, {
    timestamp: result.timestamp,
    public_id: result.publicId,
    upload_preset: SIGNED_UPLOAD_PRESET,
    overwrite: false,
  });
  assert.equal(
    result.signature,
    cloudinary.utils.api_sign_request(result.params, TEST_API_SECRET)
  );
});

test('Cloudinary environment is read lazily and missing credentials fail closed', async () => {
  delete process.env.CLOUDINARY_API_SECRET;

  await assert.rejects(
    mediaService.createUploadSignature(
      new mongoose.Types.ObjectId().toString()
    ),
    /Cloudinary backend credentials are not configured/
  );
});

test('completeUpload verifies Cloudinary and upserts authoritative metadata', async () => {
  const data = fixture();
  let resourceRequest: { publicId: string; options: unknown } | undefined;
  let upsert:
    { filter: unknown; update: unknown; options: unknown } | undefined;
  mockResource(
    {
      public_id: data.publicId,
      resource_type: 'image',
      version: data.version,
      format: data.format,
      secure_url: data.secureUrl,
      bytes: MAX_IMAGE_BYTES,
    },
    (publicId, options) => {
      resourceRequest = { publicId, options };
    }
  );
  (
    MediaAsset as unknown as {
      findOneAndUpdate: (
        filter: unknown,
        update: unknown,
        options: unknown
      ) => Promise<unknown>;
    }
  ).findOneAndUpdate = async (filter, update, options) => {
    upsert = { filter, update, options };
    return {};
  };

  const result = await mediaService.completeUpload(data.userId, data);

  assert.deepEqual(result, { secureUrl: data.secureUrl });
  assert.deepEqual(resourceRequest, {
    publicId: data.publicId,
    options: { resource_type: 'image' },
  });
  assert.deepEqual(upsert?.filter, {
    publicId: data.publicId,
    owner: new mongoose.Types.ObjectId(data.userId),
  });
  assert.deepEqual(upsert?.options, {
    upsert: true,
    new: true,
    runValidators: true,
    setDefaultsOnInsert: true,
  });
  assert.equal(
    (upsert?.update as { $set: { secureUrl: string } }).$set.secureUrl,
    data.secureUrl
  );
  assert.deepEqual(
    (upsert?.update as { $setOnInsert: { owner: mongoose.Types.ObjectId } })
      .$setOnInsert.owner,
    new mongoose.Types.ObjectId(data.userId)
  );
});

test('completeUpload rejects a public ID outside the authenticated user folder', async () => {
  const data = fixture();
  data.publicId = `x_clone/users/${new mongoose.Types.ObjectId()}/123e4567-e89b-42d3-a456-426614174000`;

  await assert.rejects(
    mediaService.completeUpload(data.userId, data),
    (error: unknown) =>
      error instanceof MediaValidationError &&
      error.message === 'Invalid image public ID'
  );
});

test('completeUpload rejects a forged response before calling the Admin API', async () => {
  const data = fixture();
  let resourceCalled = false;
  mockResource({}, () => {
    resourceCalled = true;
  });

  await assert.rejects(
    mediaService.completeUpload(data.userId, {
      ...data,
      signature: '0'.repeat(40),
    }),
    /Invalid Cloudinary response signature/
  );
  assert.equal(resourceCalled, false);
});

test('completeUpload rejects URLs from a different Cloudinary tenant', async () => {
  const data = fixture();

  await assert.rejects(
    mediaService.completeUpload(data.userId, {
      ...data,
      secureUrl: data.secureUrl.replace(TEST_CLOUD_NAME, 'other-cloud'),
    }),
    /configured Cloudinary account/
  );
});

test('completeUpload rejects oversized authoritative Cloudinary resources', async () => {
  const data = fixture();
  let destroyed: { publicId: string; options: unknown } | undefined;
  cloudinary.uploader.destroy = (async (
    publicId: string,
    options?: unknown
  ) => {
    destroyed = { publicId, options };
    return { result: 'ok' };
  }) as typeof cloudinary.uploader.destroy;
  mockResource({
    public_id: data.publicId,
    resource_type: 'image',
    version: data.version,
    format: data.format,
    secure_url: data.secureUrl,
    bytes: MAX_IMAGE_BYTES + 1,
  });

  await assert.rejects(
    mediaService.completeUpload(data.userId, data),
    /no larger than 5 MiB/
  );
  assert.deepEqual(destroyed, {
    publicId: data.publicId,
    options: { resource_type: 'image', invalidate: true },
  });
});

test('completeUpload still rejects oversized images when cleanup fails', async () => {
  const data = fixture();
  mockResource({
    public_id: data.publicId,
    resource_type: 'image',
    version: data.version,
    format: data.format,
    secure_url: data.secureUrl,
    bytes: MAX_IMAGE_BYTES + 1,
  });
  cloudinary.uploader.destroy = (async () => {
    throw new Error('cleanup unavailable');
  }) as typeof cloudinary.uploader.destroy;
  const originalConsoleError = console.error;
  console.error = () => undefined;

  try {
    await assert.rejects(
      mediaService.completeUpload(data.userId, data),
      /no larger than 5 MiB/
    );
  } finally {
    console.error = originalConsoleError;
  }
});

test('completeUpload rejects authoritative metadata that differs from the response', async () => {
  const data = fixture();
  mockResource({
    public_id: data.publicId,
    resource_type: 'image',
    version: data.version + 1,
    format: data.format,
    secure_url: data.secureUrl.replace(
      `v${data.version}`,
      `v${data.version + 1}`
    ),
    bytes: 100,
  });

  await assert.rejects(
    mediaService.completeUpload(data.userId, data),
    /does not match the uploaded image/
  );
});

test('assertOwnedImageUrls returns canonical URLs registered to the owner', async () => {
  const data = fixture();
  mockOwnedUrls([data.secureUrl], data.userId);

  const result = await mediaService.assertOwnedImageUrls(data.userId, [
    data.secureUrl,
  ]);

  assert.deepEqual(result, [data.secureUrl]);
});

test('assertOwnedImageUrls rejects malformed lists and unowned URLs', async () => {
  const data = fixture();
  mockOwnedUrls([]);

  await assert.rejects(
    mediaService.assertOwnedImageUrls(data.userId, 'not-an-array'),
    /Images must be an array/
  );
  await assert.rejects(
    mediaService.assertOwnedImageUrls(
      data.userId,
      Array.from({ length: 9 }, () => data.secureUrl)
    ),
    /maximum of 8 images/
  );
  await assert.rejects(
    mediaService.assertOwnedImageUrls(data.userId, [data.secureUrl]),
    /authenticated user/
  );
});

test('assertOwnedImageUrls permits exact legacy URLs explicitly retained during edits', async () => {
  const data = fixture();
  const legacyUrl = 'https://legacy.example.com/image.png';
  let findCalled = false;
  (MediaAsset as unknown as { find: () => unknown }).find = () => {
    findCalled = true;
    return {};
  };

  const result = await mediaService.assertOwnedImageUrls(
    data.userId,
    [legacyUrl],
    { allowExisting: [legacyUrl] }
  );

  assert.deepEqual(result, [legacyUrl]);
  assert.equal(findCalled, false);
});

test('assertOwnedImageUrls rejects non-canonical URLs when newly introduced', async () => {
  const userId = new mongoose.Types.ObjectId().toString();

  await assert.rejects(
    mediaService.assertOwnedImageUrls(userId, [
      'https://example.com/new-image.png',
    ]),
    /configured Cloudinary account/
  );
});

test('assertOwnedImageUrls permits unregistered exact-tenant URLs only in migration mode', async () => {
  const data = fixture();
  mockOwnedUrls([]);
  process.env.MEDIA_ALLOW_UNREGISTERED_CLOUDINARY = 'true';

  assert.deepEqual(
    await mediaService.assertOwnedImageUrls(data.userId, [data.secureUrl]),
    [data.secureUrl]
  );
});

test('assertOwnedImageUrls rejects another owners registered URL in migration mode', async () => {
  const data = fixture();
  mockOwnedUrls([data.secureUrl], new mongoose.Types.ObjectId().toString());
  process.env.MEDIA_ALLOW_UNREGISTERED_CLOUDINARY = 'true';

  await assert.rejects(
    mediaService.assertOwnedImageUrls(data.userId, [data.secureUrl]),
    /authenticated user/
  );
});

test('assertOwnedImageUrls accepts an empty list without Cloudinary configuration', async () => {
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;

  assert.deepEqual(await mediaService.assertOwnedImageUrls('user-id', []), []);
});
