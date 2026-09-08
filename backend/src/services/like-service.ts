import mongoose from 'mongoose';
import Like from '../models/Like';
import { toObjectId } from '../utils/object-id';
import type { LikeTargetType } from '../utils/like-status';

interface LikeToggleCounter {
  targetExists(targetId: mongoose.Types.ObjectId): Promise<boolean>;
  incrementLikeCount(
    targetId: mongoose.Types.ObjectId,
    delta: number
  ): Promise<void>;
}

interface LikeCountSetter {
  setLikeCount(targetId: mongoose.Types.ObjectId, value: number): Promise<void>;
}

type ToggleLikeResult = 'liked' | 'unliked' | 'not_found';

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
}

/**
 * Toggle a like against the `Like` edge collection and keep the target's
 * cached `likeCount` in sync. Both the unlike and like paths are a single
 * atomic operation on `Like` (delete-if-exists / create-if-absent, guarded
 * by the unique compound index) — the same compare-and-swap principle as
 * the embedded-array fix this replaces, just on an edge collection instead
 * of an array field.
 *
 * `incrementLikeCount` is a second, non-transactional write after the
 * `Like` CAS succeeds. A crash between the two can drift `likeCount` from
 * the true `Like.countDocuments(...)` — see `recomputeLikeCount` for the
 * reconciliation helper.
 */
async function toggleLike(
  counter: LikeToggleCounter,
  targetType: LikeTargetType,
  targetId: string,
  userId: string
): Promise<ToggleLikeResult> {
  const targetObjectId = toObjectId(targetId);
  const userObjectId = toObjectId(userId);

  const targetExists = await counter.targetExists(targetObjectId);
  if (!targetExists) {
    return 'not_found';
  }

  const deleted = await Like.findOneAndDelete({
    user: userObjectId,
    targetType,
    targetId: targetObjectId,
  });
  if (deleted) {
    await counter.incrementLikeCount(targetObjectId, -1);
    return 'unliked';
  }

  try {
    await Like.create({
      user: userObjectId,
      targetType,
      targetId: targetObjectId,
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
    return 'liked';
  }

  await counter.incrementLikeCount(targetObjectId, 1);
  return 'liked';
}

/**
 * Reconciliation helper for the drift window described above: recomputes
 * `likeCount` from the actual `Like` documents. Not wired into any request
 * path — a small, honest stand-in for the "reconciliation job" a real
 * async queue would run, without needing queue infrastructure this app
 * doesn't otherwise have.
 */
async function recomputeLikeCount(
  counter: LikeCountSetter,
  targetType: LikeTargetType,
  targetId: string
): Promise<number> {
  const targetObjectId = toObjectId(targetId);
  const count = await Like.countDocuments({
    targetType,
    targetId: targetObjectId,
  });
  await counter.setLikeCount(targetObjectId, count);
  return count;
}

export type { LikeToggleCounter, LikeCountSetter, ToggleLikeResult };
export { toggleLike, recomputeLikeCount };
