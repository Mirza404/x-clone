import mongoose from 'mongoose';

export async function getUserNameByID(author: string): Promise<string> {
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
