import mongoose from 'mongoose';
import {
  connectToDatabase,
  disconnectFromDatabase,
} from '../src/db/connection';
import Like from '../src/models/Like';

// One-off migration for the embedded-array -> Like-collection redesign.
// Existing posts/comments still carry their old `likes: ObjectId[]` field in
// storage (removing it from the Mongoose schema doesn't delete the data) —
// this reads that raw field via the driver and turns each entry into a
// `Like` document plus a `likeCount` on the target. Safe to re-run: the
// unique (user, targetType, targetId) index on `Like` makes re-inserting an
// already-migrated like a no-op duplicate-key error instead of a double
// count.
//
// Run once per environment, after deploying the `Like` model but before
// relying on `likeCount`/`isLiked` being correct: `npm run backfill:likes`.

interface LegacyLikesDoc {
  _id: mongoose.Types.ObjectId;
  likes?: mongoose.Types.ObjectId[];
  createdAt?: Date;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
}

async function backfillCollection(
  collectionName: 'posts' | 'comments',
  targetType: 'post' | 'comment'
): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database not connected');
  }

  const collection = db.collection<LegacyLikesDoc>(collectionName);
  const cursor = collection.find({ likes: { $exists: true, $ne: [] } });

  let migrated = 0;
  for await (const doc of cursor) {
    const likerIds = doc.likes ?? [];
    if (likerIds.length === 0) {
      continue;
    }

    const likeDocs = likerIds.map((userId) => ({
      user: userId,
      targetType,
      targetId: doc._id,
      createdAt: doc.createdAt ?? new Date(),
    }));

    try {
      await Like.insertMany(likeDocs, { ordered: false });
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
    }

    await collection.updateOne(
      { _id: doc._id },
      { $set: { likeCount: likerIds.length } }
    );
    migrated += 1;
  }

  console.info(`Backfilled ${migrated} ${collectionName} with likes.`);
}

async function main(): Promise<void> {
  await connectToDatabase();
  await backfillCollection('posts', 'post');
  await backfillCollection('comments', 'comment');
  await disconnectFromDatabase();
}

main().catch((error) => {
  console.error('Failed to backfill likes:', error);
  process.exit(1);
});
