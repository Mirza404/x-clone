import mongoose from 'mongoose';
import {
  connectToDatabase,
  disconnectFromDatabase,
  getUsersCollection,
} from '../src/db/connection';
import Follow from '../src/models/Follow';
import Conversation, { participantsKey } from '../src/models/Conversation';
import Message from '../src/models/Message';

// Gives your real (Google-login) account mutual follows with a handful of
// seeded demo accounts, plus a short DM history with each, so the Messages
// page and floating chat bubble have real data to show while testing.
const SEED_EMAIL_DOMAIN = '@seed.x-clone.local';

const OPENERS = [
  'Hey! Good to connect.',
  'Saw your latest post, nice work.',
  'Are you going to the meetup this week?',
  'Let me know if you need a hand with anything.',
  'What are you working on these days?',
];

const REPLIES = [
  'Thanks! Appreciate it.',
  'Yeah, for sure — count me in.',
  'Not much, just shipping small stuff. You?',
  'Haha fair enough.',
  'Sounds good, talk soon.',
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedConversation(
  myId: mongoose.Types.ObjectId,
  otherId: mongoose.Types.ObjectId
): Promise<void> {
  const key = participantsKey(myId, otherId);

  let conversation = await Conversation.findOne({ participantsKey: key });
  if (!conversation) {
    conversation = await Conversation.create({
      participants: [myId, otherId],
      participantsKey: key,
      lastMessageAt: new Date(),
      unread: [
        { user: myId, count: 0 },
        { user: otherId, count: 0 },
      ],
    });
  }

  const existing = await Message.countDocuments({
    conversation: conversation._id,
  });
  if (existing > 0) {
    return;
  }

  const messageCount = randomInt(2, 4);
  const now = Date.now();
  const messages = Array.from({ length: messageCount }, (_, i) => {
    const fromMe = i % 2 === 1;
    const minutesAgo = (messageCount - i) * randomInt(5, 90);
    return {
      conversation: conversation!._id,
      sender: fromMe ? myId : otherId,
      content: fromMe
        ? REPLIES[i % REPLIES.length]
        : OPENERS[i % OPENERS.length],
      readBy: fromMe ? [myId, otherId] : [otherId],
      deliveredTo: [myId, otherId],
      createdAt: new Date(now - minutesAgo * 60 * 1000),
    };
  });

  const inserted = await Message.insertMany(messages);
  const lastMessage = inserted[inserted.length - 1];
  const lastMessageIsUnreadForMe = lastMessage.sender.toString() !== myId.toString();

  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        lastMessage: lastMessage._id,
        lastMessageAt: lastMessage.createdAt,
      },
    }
  );

  if (lastMessageIsUnreadForMe) {
    await Conversation.updateOne(
      { _id: conversation._id, 'unread.user': myId },
      { $set: { 'unread.$.count': 1 } }
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const emailArg = args.find((arg) => arg.startsWith('--email='));
  const countArg = args.find((arg) => arg.startsWith('--count='));
  const email = emailArg
    ? emailArg.split('=')[1]
    : 'mirzaabdulahovic1@gmail.com';
  const count = countArg ? parseInt(countArg.split('=')[1], 10) : 5;

  await connectToDatabase();

  const usersCollection = getUsersCollection();
  const me = await usersCollection.findOne({ email });

  if (!me) {
    console.error(
      `No user found with email ${email}. Sign in with that account at least once (so NextAuth creates the user record), then re-run this script.`
    );
    await disconnectFromDatabase();
    process.exit(1);
  }

  const seedUsers = await usersCollection
    .find({ email: { $regex: `${SEED_EMAIL_DOMAIN}$` } })
    .limit(count)
    .toArray();

  if (seedUsers.length === 0) {
    console.error(
      'No seeded demo accounts found. Run `npm run seed` in backend/ first.'
    );
    await disconnectFromDatabase();
    process.exit(1);
  }

  const myId = me._id as mongoose.Types.ObjectId;

  for (const seedUser of seedUsers) {
    const otherId = seedUser._id as mongoose.Types.ObjectId;

    await Follow.updateOne(
      { follower: myId, following: otherId },
      { $setOnInsert: { follower: myId, following: otherId, createdAt: new Date() } },
      { upsert: true }
    );
    await Follow.updateOne(
      { follower: otherId, following: myId },
      { $setOnInsert: { follower: otherId, following: myId, createdAt: new Date() } },
      { upsert: true }
    );

    await seedConversation(myId, otherId);

    console.info(`Mutual follow + DM thread set up with ${seedUser.name}.`);
  }

  console.info(
    `Done. ${seedUsers.length} seeded accounts now mutually follow ${email} and have a message thread with them.`
  );

  await disconnectFromDatabase();
}

main().catch((error) => {
  console.error('Failed to seed follows/messages:', error);
  process.exit(1);
});
