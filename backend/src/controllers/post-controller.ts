import mongoose from "mongoose";
import Post from "../models/Post";
import { NextFunction, Request, Response } from "express";
import { getUserIdByEmail, getUserNameByID } from "./user-controllers";

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

    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    // Fetch posts
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const postsWithUserData = await Promise.all(
      posts.map(async (post) => {
        //@ts-ignore
        const user = await mongoose.connection.db.collection("users").findOne(
          { _id: new mongoose.Types.ObjectId(post.author) }, // Convert author ID to ObjectId
          { projection: { image: 1 } }
        );

        return {
          id: post._id,
          content: post.content,
          images: post.images,
          name: post.name,
          createdAt: post.createdAt,
          author: post.author,
          authorImage: user?.image || "https://via.placeholder.com/150",
        };
      })
    );

    const totalPosts = await Post.countDocuments();
    const totalPages = Math.ceil(totalPosts / limit);

    res
      .status(200)
      .json({ posts: postsWithUserData, totalPages, currentPage: page });
  } catch (e) {
    console.error("Error getting posts:", e);
    if (!res.headersSent) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
}

async function getPost(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: "Post ID is required" });
      return;
    }

    if (mongoose.connection.readyState !== 1) {
      res.status(500).json({ message: "Database not connected" });
      return;
    }

    const post = await Post.findById(id);

    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    res.status(200).json({ post });
  } catch (e) {
    console.error("Error getting post:", e);
    if (!res.headersSent) {
      res.status(500).json({ message: e });
    }
  }
}

async function createPost(req: Request, res: Response): Promise<void> {
  try {
    const { content, email, images } = req.body; // Accept images array

    if (!email) {
      res.status(400).json({ message: "Email is required" });
      return;
    }

    console.log(`Finding user by email: ${email}`);
    const author = await getUserIdByEmail(email);

    if (!author) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const name = await getUserNameByID(author.toString().trim());

    if (!content && (!images || images.length === 0)) {
      res
        .status(400)
        .json({ message: "Post must have content or at least one image" });
      return;
    }

    if (mongoose.connection.readyState !== 1) {
      res.status(500).json({ message: "Database not connected" });
      return;
    }

    const date = new Date().toISOString();

    //@ts-ignore
    const user = await mongoose.connection.db
      .collection("users")
      .findOne(
        { _id: new mongoose.Types.ObjectId(author) },
        { projection: { image: 1 } }
      );

    const newPost = new Post({
      author,
      name,
      content,
      images, // Store array of image URLs
      createdAt: date,
      authorImage: user?.image || "https://via.placeholder.com/150",
    });

    await newPost.save();

    res.status(201).json({
      message: "Post created successfully",
      post: newPost, // Send full post object
    });
  } catch (e) {
    console.error("Error creating post:", e);
    if (!res.headersSent) {
      res.status(500).json({ message: "Internal server error" });
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

async function editPost(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id, content } = req.body;

    if (!id || !content) {
      res.status(400).json({ message: "Post ID and content are required" });
      return;
    }

    if (mongoose.connection.readyState !== 1) {
      res.status(500).json({ message: "Database not connected" });
      return;
    }

    await Post.updateOne({ _id: id }, { content });

    res.status(200).json({ message: "Post updated successfully" });
  } catch (e) {
    console.error("Error updating post:", e);
    if (!res.headersSent) {
      res.status(500).json({ message: e });
    }
  }
}

export { allPosts, getPost, createPost, deletePost, editPost };
