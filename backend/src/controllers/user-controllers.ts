import mongoose from "mongoose";
import { NextFunction, Request, Response } from "express";

export async function getUserIdByEmail(
  email: string
): Promise<mongoose.Types.ObjectId> {
  try {
    const db = mongoose.connection.db;

    //check db connection
    if (!db) {
      throw new Error("No database connection");
    }
    const usersCollection = db.collection("users"); // Adjust collection name as needed
    const user = await usersCollection.findOne({ email });

    if (!user) {
      throw new Error("User not found");
    }

    return user._id; // MongoDB's unique identifier
  } catch (error) {
    console.error("Error retrieving user ID:", error);
    throw error;
  }
}

export const handleEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { content, email } = req.body;

  if (!email) {
    res.status(400).json({ message: "Email is required" });
  }

  // Process the email (e.g., store in database, send a welcome email, etc.)
  console.log("Received email:", email);

  res.status(200).json({ message: "Email received successfully" });

  const userId = await getUserIdByEmail(email);

  console.log("sending id (from email) and content: ", userId, content);

  await fetch("http://localhost:3001/api/post/new", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content, author: userId }),
  });
};
