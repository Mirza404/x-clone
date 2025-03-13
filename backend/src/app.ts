import { config } from 'dotenv';
import appRouter from './routes';
import { connectToDatabase } from './db/connection';

const morgan = require('morgan');
const express = require('express');
const app = express();
const cors = require('cors');
config();

async function connectToMongo() {
  await connectToDatabase();
  console.log('Database connection established');
}

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
connectToMongo();

app.use('/api', appRouter);

export default app;
