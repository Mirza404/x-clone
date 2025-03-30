import { NextFunction } from 'express';
import mongoose, { Mongoose } from 'mongoose';
export async function getUserIdByEmail(
  email: string
): Promise<mongoose.Types.ObjectId> {
  try {
    const db = mongoose.connection.db;

    //check db connection
    if (!db) {
      throw new Error('No database connection');
    }
    const usersCollection = db.collection('users'); // Adjust collection name as needed
    const user = await usersCollection.findOne({ email });

    if (!user) {
      throw new Error('User not found');
    }

    return user._id; // MongoDB's unique identifie
  } catch (error) {
    console.error('Error retrieving user ID:', error);
    throw error;
  }
}

export async function getUserNameByID(author: string): Promise<String> {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('No database connection');
    }
    const usersCollection = db.collection('users'); // Adjust collection name as needed
    const user = await usersCollection.findOne({
      _id: new mongoose.Types.ObjectId(author),
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user.name;
  } catch (error) {
    console.error("Error retrieving user's name: ", error);
    throw error;
  }
}
