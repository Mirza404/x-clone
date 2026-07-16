import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import { collectCommentThreadIds } from './comment-tree';

test('collectCommentThreadIds includes the parent comment and replies', () => {
  const commentId = new mongoose.Types.ObjectId();
  const replyId = new mongoose.Types.ObjectId();

  assert.deepEqual(
    collectCommentThreadIds({
      _id: commentId,
      replies: [replyId.toString()],
    }).map((id) => id.toString()),
    [commentId.toString(), replyId.toString()]
  );
});

test('collectCommentThreadIds handles comments without replies', () => {
  const commentId = new mongoose.Types.ObjectId();

  assert.deepEqual(
    collectCommentThreadIds({ _id: commentId }).map((id) => id.toString()),
    [commentId.toString()]
  );
});
