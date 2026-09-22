import mongoose from 'mongoose';
import Like from '../models/Like';
import { toObjectId } from './object-id';

type LikeTargetType = 'post' | 'comment';

/**
 * Batched membership check: which of `targetIds` has `userId` liked.
 * One query per page instead of one per item — avoids the N+1 pattern.
 */
async function getLikedTargetIds(
  userId: string | undefined,
  targetType: LikeTargetType,
  targetIds: Array<mongoose.Types.ObjectId | string>
): Promise<Set<string>> {
  if (!userId || targetIds.length === 0) {
    return new Set();
  }

  const likes = await Like.find({
    user: toObjectId(userId),
    targetType,
    targetId: { $in: targetIds },
  })
    .select('targetId')
    .lean();

  return new Set(likes.map((like) => like.targetId.toString()));
}

export type { LikeTargetType };
export { getLikedTargetIds };
