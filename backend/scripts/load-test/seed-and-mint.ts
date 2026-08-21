import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import {
  connectToDatabase,
  disconnectFromDatabase,
  getUsersCollection,
} from '../../src/db/connection';
import Conversation from '../../src/models/Conversation';
import Message from '../../src/models/Message';
import Post from '../../src/models/Post';

const LOAD_TEST_EMAIL_DOMAIN = '@load-test.x-clone.local';

const TOKEN_EXPIRY = '24h';

const OUTPUT_PATH = path.resolve(__dirname, '../../../load-test/tokens.json');

const FIRST_NAMES = [
  'Ada',
  'Grace',
  'Alan',
  'Linus',
  'Margaret',
  'Tim',
  'Barbara',
  'Vint',
  'Katherine',
  'Dennis',
  'Radia',
  'Ken',
  'Frances',
  'John',
  'Hedy',
  'Joan',
  'Donald',
  'Adele',
  'Edsger',
  'Marissa',
];

const LAST_NAMES = [
  'Lovelace',
  'Hopper',
  'Turing',
  'Torvalds',
  'Hamilton',
  'Berners-Lee',
  'Liskov',
  'Cerf',
  'Johnson',
  'Ritchie',
  'Perlman',
  'Thompson',
  'Allen',
  'Carmack',
  'Lamarr',
  'Shannon',
  'Clarke',
  'Knuth',
  'Goldberg',
  'Dijkstra',
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)];
}

interface LoadTestUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  image: string;
  emailVerified: null;
}

function buildLoadTestUsers(count: number): LoadTestUser[] {
  return Array.from({ length: count }, (_, i) => {
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const handle = `${name.toLowerCase().replace(/[^a-z]/g, '')}${i}`;
    return {
      _id: new mongoose.Types.ObjectId(),
      name,
      email: `${handle}${LOAD_TEST_EMAIL_DOMAIN}`,
      image: `https://i.pravatar.cc/300?u=${handle}`,
      emailVerified: null,
    };
  });
}

async function wipeLoadTestData(): Promise<void> {
  const usersCollection = getUsersCollection();
  const existing = await usersCollection
    .find(
      { email: { $regex: `${LOAD_TEST_EMAIL_DOMAIN}$` } },
      { projection: { _id: 1 } }
    )
    .toArray();

  if (existing.length === 0) {
    fs.rmSync(OUTPUT_PATH, { force: true });
    console.info('No previously seeded load test users to wipe.');
    return;
  }

  const ids = existing.map((user) => user._id);
  const loadTestConversations = await Conversation.find(
    { participants: { $in: ids } },
    { _id: 1 }
  ).lean();
  const conversationIds = loadTestConversations.map(
    (conversation) => conversation._id
  );
  const deletedMessages = await Message.deleteMany({
    $or: [{ sender: { $in: ids } }, { conversation: { $in: conversationIds } }],
  });
  const deletedConversations = await Conversation.deleteMany({
    _id: { $in: conversationIds },
  });
  const cleanedPosts = await Post.updateMany(
    { likes: { $in: ids } },
    { $pull: { likes: { $in: ids } } }
  );
  await usersCollection.deleteMany({ _id: { $in: ids } });
  fs.rmSync(OUTPUT_PATH, { force: true });
  console.info(
    `Wiped ${ids.length} load test users, ${deletedConversations.deletedCount} ` +
      `conversations, ${deletedMessages.deletedCount} messages, and load test ` +
      `likes from ${cleanedPosts.modifiedCount} posts.`
  );
}

async function seedUsers(count: number): Promise<LoadTestUser[]> {
  const usersCollection = getUsersCollection();
  const users = buildLoadTestUsers(count);
  await usersCollection.insertMany(users);
  console.info(`Inserted ${users.length} load test users.`);
  return users;
}

function getSecret(): string {
  const secret = process.env.BACKEND_JWT_SECRET;
  if (!secret) {
    throw new Error('BACKEND_JWT_SECRET is not set');
  }
  return secret;
}

interface MintedToken {
  userId: string;
  email: string;
  token: string;
}

function mintTokens(users: LoadTestUser[]): MintedToken[] {
  const secret = getSecret();
  return users.map((user) => {
    const userId = user._id.toString();
    const token = jwt.sign({ sub: userId }, secret, {
      issuer: 'x-clone-frontend',
      audience: 'x-clone-backend',
      expiresIn: TOKEN_EXPIRY,
    });
    return { userId, email: user.email, token };
  });
}

function writeTokens(tokens: MintedToken[]): void {
  const outputDir = path.dirname(OUTPUT_PATH);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(tokens, null, 2));
  console.info(`Wrote ${tokens.length} tokens to ${OUTPUT_PATH}`);
}

function parseCount(args: string[]): number {
  const countArg = args.find((arg) => arg.startsWith('--count='));
  return countArg ? parseInt(countArg.split('=')[1], 10) : 20;
}

async function main() {
  const args = process.argv.slice(2);
  const wipe = args.includes('--wipe');

  await connectToDatabase();

  if (wipe) {
    await wipeLoadTestData();
    await disconnectFromDatabase();
    return;
  }

  const count = parseCount(args);
  console.info(`Seeding ${count} load test users and minting tokens.`);

  const users = await seedUsers(count);
  const tokens = mintTokens(users);
  writeTokens(tokens);

  await disconnectFromDatabase();
}

main().catch((error) => {
  console.error('Load test seed failed:', error);
  process.exit(1);
});
