import { Request, Response } from "express";
import { config } from "dotenv";
const express = require("express");
const app = express();
const cors = require("cors");
config();

app.use(cors());
app.use(express.json());

app.get("/api/home", (req: Request, res: Response) => {
  res.json({ message: "Hello from express backend server!" });
});

export default app;