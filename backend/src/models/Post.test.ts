import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import Post from './Post';

test('post model accepts a minimal valid post', () => {
  const post = new Post({
    content: 'A baseline post',
    author: new mongoose.Types.ObjectId(),
    name: 'Mirza',
  });

  assert.equal(post.validateSync(), undefined);
  assert.deepEqual(post.likes, []);
  assert.deepEqual(post.comments, []);
});

test('post model requires content, author, and name', () => {
  const post = new Post({});
  const error = post.validateSync();

  assert.ok(error);
  assert.ok(error.errors.content);
  assert.ok(error.errors.author);
  assert.ok(error.errors.name);
});

test('post model rejects content longer than 380 characters', () => {
  const post = new Post({
    content: 'x'.repeat(381),
    author: new mongoose.Types.ObjectId(),
    name: 'Mirza',
  });
  const error = post.validateSync();

  assert.ok(error);
  assert.ok(error.errors.content);
});
