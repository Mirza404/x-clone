import mongoose from 'mongoose';
import {
  connectToDatabase,
  disconnectFromDatabase,
  getUsersCollection,
} from '../src/db/connection';
import Post from '../src/models/Post';
import Follow from '../src/models/Follow';

// Seed users are tagged with this email suffix so `--wipe` can find and
// remove exactly the accounts (and only the accounts) this script created,
// without touching real users signed in via Google.
const SEED_EMAIL_DOMAIN = '@seed.x-clone.local';

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
  'Claude',
  'Joan',
  'Donald',
  'Adele',
  'Edsger',
  'Marissa',
  'Steve',
  'Sheryl',
  'Larry',
  'Susan',
  'Jack',
  'Elon',
  'Sundar',
  'Satya',
  'Ginni',
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
  'Mayer',
  'Jobs',
  'Sandberg',
  'Page',
  'Wojcicki',
  'Dorsey',
  'Musk',
  'Pichai',
  'Nadella',
  'Rometty',
];

const POST_SNIPPETS = [
  'Just shipped a new feature, feels good.',
  'Coffee first, code second.',
  'Anyone else debugging in production right now?',
  'Refactored a whole module today, no regrets.',
  'Hot take: tabs vs spaces doesn’t matter, consistency does.',
  'Reading through an old codebase, learning a lot.',
  'Deploys on a Friday, living dangerously.',
  'Finally fixed that flaky test.',
  'Standup ran long today, worth it though.',
  'Trying out a new editor theme, thoughts?',
  'Wrote a script to automate the boring stuff.',
  'Code review comments are a love language.',
  'Rubber duck debugging actually works.',
  'Merged my first PR of the year.',
  'Spent the day untangling legacy dependencies.',
  'New keyboard, new me.',
  'Unit tests saved me today.',
  'Pairing session turned into a two-hour deep dive.',
  'Migrated the database with zero downtime.',
  'Weekend project: building something small and useless.',
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function pickMany<T>(items: readonly T[], count: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

interface SeedUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  image: string;
  emailVerified: null;
}

function buildSeedUsers(count: number): SeedUser[] {
  return Array.from({ length: count }, (_, i) => {
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const handle = `${name.toLowerCase().replace(/[^a-z]/g, '')}${i}`;
    return {
      _id: new mongoose.Types.ObjectId(),
      name,
      email: `${handle}${SEED_EMAIL_DOMAIN}`,
      image: `https://i.pravatar.cc/300?u=${handle}`,
      emailVerified: null,
    };
  });
}

async function wipeSeedData(): Promise<void> {
  const usersCollection = getUsersCollection();
  const existing = await usersCollection
    .find(
      { email: { $regex: `${SEED_EMAIL_DOMAIN}$` } },
      { projection: { _id: 1 } }
    )
    .toArray();

  if (existing.length === 0) {
    console.info('No previously seeded users to wipe.');
    return;
  }

  const ids = existing.map((user) => user._id);
  await Post.deleteMany({ author: { $in: ids } });
  await Follow.deleteMany({
    $or: [{ follower: { $in: ids } }, { following: { $in: ids } }],
  });
  await usersCollection.deleteMany({ _id: { $in: ids } });
  console.info(
    `Wiped ${ids.length} previously seeded users (and their posts/follows).`
  );
}

async function seedUsers(count: number): Promise<SeedUser[]> {
  const usersCollection = getUsersCollection();
  const users = buildSeedUsers(count);
  await usersCollection.insertMany(users);
  console.info(`Inserted ${users.length} seed users.`);
  return users;
}

async function seedPosts(users: SeedUser[]): Promise<void> {
  const posts = users.flatMap((user) => {
    const postCount = randomInt(1, 4);
    return Array.from({ length: postCount }, () => {
      const daysAgo = randomInt(0, 30);
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const likedBy = pickMany(
        users.filter((other) => other._id !== user._id),
        randomInt(0, 6)
      ).map((liker) => liker._id);

      return {
        author: user._id,
        name: user.name,
        content: pick(POST_SNIPPETS),
        images: [],
        createdAt,
        likes: likedBy,
        comments: [],
      };
    });
  });

  await Post.insertMany(posts);
  console.info(`Inserted ${posts.length} seed posts.`);
}

async function seedFollows(users: SeedUser[]): Promise<void> {
  const seenPairs = new Set<string>();
  const follows = users.flatMap((user) => {
    const targets = pickMany(
      users.filter((other) => other._id !== user._id),
      randomInt(2, 8)
    );

    return targets
      .filter((target) => {
        const key = `${user._id}_${target._id}`;
        if (seenPairs.has(key)) return false;
        seenPairs.add(key);
        return true;
      })
      .map((target) => ({
        follower: user._id,
        following: target._id,
        createdAt: new Date(),
      }));
  });

  if (follows.length > 0) {
    await Follow.insertMany(follows);
  }
  console.info(`Inserted ${follows.length} seed follows.`);
}

async function main() {
  const args = process.argv.slice(2);
  const wipe = args.includes('--wipe');
  const countArg = args.find((arg) => arg.startsWith('--users='));
  const count = countArg ? parseInt(countArg.split('=')[1], 10) : 30;

  await connectToDatabase();

  if (wipe) {
    await wipeSeedData();
  }

  const users = await seedUsers(count);
  await seedPosts(users);
  await seedFollows(users);

  await disconnectFromDatabase();
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
