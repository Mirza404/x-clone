import {Request, Response} from 'express';
const express = require("express");
const app = express();
const PORT = 3001;
const cors = require("cors");

app.use(cors());

app.get("/api/home", (req: Request, res: Response) => {
  res.json({ message: "Hello from express backend server!" });
});

app.listen(PORT, () => {
  console.log(`Server up on port: ${PORT}`);
});
