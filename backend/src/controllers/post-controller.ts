import mongoose from "mongoose";
import Post from "src/models/Post";
import { Request, Response } from "express";
import { getUserIdByEmail } from "./user-controllers";
import { connectToDatabase } from "src/db/connection";

async function createPost(req: Request, res: Response): Promise<void> {
  try {
    console.log("CREATING POST...");
    console.log("CREATING POST...");
    console.log("CREATING POST...");
    console.log("CREATING POST...");

    await connectToDatabase(); // Ensure you're connected to the database
    const { email, postData } = req.body;
    const userId = await getUserIdByEmail(email); // Get the user ID by email

    const newPost = await Post.create({
      content: postData.content,
      author: email,
      createdAt: new Date(),
    });

    // Save the new post
    const savedPost = await newPost.save();

    console.log("Post created successfully:", savedPost);
  } catch (e) {
    console.error("Error creating post:", e);
    throw e; // Propagate the error
  }
}

export { createPost };
