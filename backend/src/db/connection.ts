import mongoose from 'mongoose';
import { config } from 'dotenv';
import path from 'path';

export function loadEnv(context: 'backend' | 'frontend') {
  const envPath = path.resolve(__dirname, `../../${context}/.env`);
  config({ path: envPath });
}

loadEnv('backend');

config();

async function connectToDatabase() {
  const uri = process.env.MONGODB_URL;

  if (!uri) {
    throw new Error('MONGODB_URL not defined!');
  }
  try {
    await mongoose.connect(uri);
    console.log('Mongo DB connection established');
  } catch (error) {
    console.log(error);
    throw new Error('Can not connect to the Database.');
  }
}

async function disconnectFromDatabase() {
  try {
    await mongoose.disconnect();
  } catch (error) {
    console.log(error);
    throw new Error('Error disconnecting from the Database.');
  }
}

export { connectToDatabase, disconnectFromDatabase };
