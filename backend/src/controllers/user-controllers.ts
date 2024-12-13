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
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ message: "Email is required" });
  }

  // Process the email (e.g., store in database, send a welcome email, etc.)
  console.log("Received email:", email);

  // Respond with a success message
  res.status(200).json({ message: "Email received successfully" });

  console.log('id: ', await getUserIdByEmail(email));
  
};
