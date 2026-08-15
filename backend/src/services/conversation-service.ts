import Conversation, { participantsKey } from '../models/Conversation';
import { getUsersCollection } from '../db/connection';
import { toObjectId } from '../utils/object-id';

interface MongoDuplicateKeyError {
  code: number;
}

function isDuplicateKeyError(error: unknown): error is MongoDuplicateKeyError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as MongoDuplicateKeyError).code === 11000
  );
}

async function getOrCreateConversation(userId: string, recipientId: string) {
  const recipient = await getUsersCollection().findOne(
    { _id: toObjectId(recipientId) },
    { projection: { _id: 1 } }
  );

  if (!recipient) {
    return null;
  }

  const key = participantsKey(userId, recipientId);
  const userObjectId = toObjectId(userId);
  const recipientObjectId = toObjectId(recipientId);

  try {
    return await Conversation.findOneAndUpdate(
      { participantsKey: key },
      {
        $setOnInsert: {
          participants: [userObjectId, recipientObjectId],
          participantsKey: key,
          lastMessageAt: new Date(),
          unread: [
            { user: userObjectId, count: 0 },
            { user: recipientObjectId, count: 0 },
          ],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return Conversation.findOne({ participantsKey: key });
    }
    throw error;
  }
}

export { getOrCreateConversation };
