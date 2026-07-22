import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import {
  connectToDatabase,
  disconnectFromDatabase,
  getUsersCollection,
} from './connection';

const hasMongoUrl = Boolean(process.env.MONGODB_URL);
const skip = hasMongoUrl
  ? false
  : 'MONGODB_URL not set — skipping integration test';

before(async () => {
  if (hasMongoUrl) {
    await connectToDatabase();
  }
});

after(async () => {
  if (hasMongoUrl) {
    await disconnectFromDatabase();
  }
});

test(
  'connectToDatabase establishes a working connection to real MongoDB',
  { skip },
  async () => {
    const users = getUsersCollection();
    const result = await users.findOne({});
    assert.equal(result === null || typeof result === 'object', true);
  }
);
