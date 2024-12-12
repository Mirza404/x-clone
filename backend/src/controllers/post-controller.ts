import mongoose from "mongoose";
import Post from "../models/Post";
import { NextFunction, Request, Response } from "express";
import { getUserIdByEmail } from "./user-controllers";
import { connectToDatabase } from "../db/connection";

async function createPost(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { author, content } = req.body;

    if (!author || !content) {
      res.status(400).json({ message: "Author and content are required" });
      return;
    }

    if (mongoose.connection.readyState !== 1) {
      res.status(500).json({ message: "Database not connected" });
      return;
    }

    const date = new Date();
    const timeString = date.toTimeString().split(" ")[0];
    const dateString = date.toDateString();
    const dateTime = `${dateString} ${timeString}`;

    const post = new Post({ author, content, createdAt: dateTime });
    await post.save();

    res.status(201).json({ message: "Post created successfully", post });
  } catch (e) {
    console.error("Error creating post:", e);
    if (!res.headersSent) {
      res.status(500).json({ message: e });
    }
  }
}

export { createPost };
