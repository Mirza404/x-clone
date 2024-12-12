import { Request, Response } from "express";
import { config } from "dotenv";
import appRouter from "./routes";
import { connectToDatabase } from "./db/connection";
import { testGetUserIdBySessionToken } from "./testSessionToken";

const morgan = require("morgan");
const express = require("express");
const app = express();
const cors = require("cors");
config();

async function connectToMongo() {
  await connectToDatabase();
  console.log("Database connection established");
  testGetUserIdBySessionToken();
}

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
connectToMongo();

app.use("/api", appRouter);

export default app;
