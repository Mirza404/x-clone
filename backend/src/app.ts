import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import appRouter from './routes';
import { connectToDatabase } from './db/connection';

const app = express();
config();

async function connectToMongo() {
  await connectToDatabase();
  console.info('Database connection established');
}

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
connectToMongo();

app.use('/api', appRouter);

export default app;
