import mongoose from "mongoose";
import Post from "../models/Post";
import { NextFunction, Request, Response } from "express";
import { getUserIdByEmail } from "./user-controllers";

async function allPosts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(500).json({ message: "Database not connected" });
      return;
    }

    const posts = await Post.find();
    const postsWithId = posts.map((post) => ({
      id: post._id,
      author: post.author,
      content: post.content,
      createdAt: post.createdAt,
    }));

    res.status(200).json({ posts: postsWithId });
  } catch (e) {
    console.error("Error getting posts:", e);
    if (!res.headersSent) {
      res.status(500).json({ message: e });
    }
  }
}

async function createPost(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { content, email } = req.body;

    if (!email) {
      res.status(400).json({ message: "Email is required" });
      return;
    }

    const author = await getUserIdByEmail(email);

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

async function deletePost(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.body;

    if (!id) {
      res.status(400).json({ message: "Post ID is required" });
      return;
    }

    if (mongoose.connection.readyState !== 1) {
      res.status(500).json({ message: "Database not connected" });
      return;
    }

    await Post.deleteOne({ _id: id });

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (e) {
    console.error("Error deleting post:", e);
    if (!res.headersSent) {
      res.status(500).json({ message: e });
    }
  }
}

export { allPosts, createPost, deletePost };
