import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import appRouter from './routes';
import { connectToDatabase } from './db/connection';

const app = express();
config();

// Disable ETag/conditional-GET: API responses are per-user and dynamic, and
// a bare 304 (no body) on refresh was making the frontend read an empty
// response body and fall back to an empty list.
app.set('etag', false);

async function connectToMongo() {
  await connectToDatabase();
  console.info('Database connection established');
}

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000' }));
app.use(express.json());
app.use(morgan('dev'));
connectToMongo();

app.use('/api', appRouter);

export default app;
