import { Request, Response } from "express";
import { config } from "dotenv";
import appRouter from "./routes";

const morgan = require("morgan");
const express = require("express");
const app = express();
const cors = require("cors");
config();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/api", appRouter);

export default app;
