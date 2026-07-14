import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import Comment from './Comment';

test('comment model accepts a minimal top-level comment', () => {
  const comment = new Comment({
    content: 'A baseline comment',
    author: new mongoose.Types.ObjectId(),
    name: 'Mirza',
    postId: new mongoose.Types.ObjectId(),
  });

  assert.equal(comment.validateSync(), undefined);
  assert.equal(comment.parentComment, null);
  assert.deepEqual(comment.replies, []);
  assert.deepEqual(comment.likes, []);
});

test('comment model accepts a reply with a parent comment', () => {
  const parentComment = new mongoose.Types.ObjectId();
  const comment = new Comment({
    content: 'A baseline reply',
    author: new mongoose.Types.ObjectId(),
    name: 'Mirza',
    postId: new mongoose.Types.ObjectId(),
    parentComment,
  });

  assert.equal(comment.validateSync(), undefined);
  assert.equal(comment.parentComment?.toString(), parentComment.toString());
});

test('comment model requires content, author, name, and postId', () => {
  const comment = new Comment({});
  const error = comment.validateSync();

  assert.ok(error);
  assert.ok(error.errors.content);
  assert.ok(error.errors.author);
  assert.ok(error.errors.name);
  assert.ok(error.errors.postId);
});
