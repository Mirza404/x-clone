import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import MediaAsset from './MediaAsset';

function validAsset() {
  return {
    owner: new mongoose.Types.ObjectId(),
    publicId: `x_clone/users/${new mongoose.Types.ObjectId()}/123`,
    version: 123,
    format: 'png',
    secureUrl:
      'https://res.cloudinary.com/test/image/upload/v123/x_clone/users/user/123.png',
  };
}

test('media asset model accepts valid registered upload metadata', () => {
  const asset = new MediaAsset(validAsset());

  assert.equal(asset.validateSync(), undefined);
});

test('media asset model requires ownership and Cloudinary metadata', () => {
  const error = new MediaAsset({}).validateSync();

  assert.ok(error);
  assert.ok(error.errors.owner);
  assert.ok(error.errors.publicId);
  assert.ok(error.errors.version);
  assert.ok(error.errors.format);
  assert.ok(error.errors.secureUrl);
});

test('media asset model rejects invalid versions and oversized URLs', () => {
  const asset = new MediaAsset({
    ...validAsset(),
    version: 0,
    secureUrl: `https://${'x'.repeat(2049)}`,
  });
  const error = asset.validateSync();

  assert.ok(error);
  assert.ok(error.errors.version);
  assert.ok(error.errors.secureUrl);
});
