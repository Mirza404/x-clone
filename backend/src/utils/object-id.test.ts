import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import { hasObjectId, toObjectId, equalsObjectId } from './object-id';

test('hasObjectId matches ObjectId values by string value', () => {
  const id = new mongoose.Types.ObjectId();

  assert.equal(hasObjectId([id], id.toString()), true);
  assert.equal(hasObjectId([id.toString()], id), true);
});

test('hasObjectId returns false when the id is not present', () => {
  const id = new mongoose.Types.ObjectId();
  const otherId = new mongoose.Types.ObjectId();

  assert.equal(hasObjectId([id], otherId), false);
});

test('toObjectId preserves ObjectId instances and converts strings', () => {
  const id = new mongoose.Types.ObjectId();

  assert.equal(toObjectId(id), id);
  assert.equal(toObjectId(id.toString()).toString(), id.toString());
});

test('equalsObjectId compares ObjectId-like values by string value', () => {
  const id = new mongoose.Types.ObjectId();
  const otherId = new mongoose.Types.ObjectId();

  assert.equal(equalsObjectId(id, id.toString()), true);
  assert.equal(equalsObjectId(id.toString(), id), true);
  assert.equal(equalsObjectId(id, otherId), false);
});
