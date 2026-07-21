import mongoose from 'mongoose';
import { Request, Response } from 'express';
import type {} from '../types/express';
import Post from '../models/Post';
import Follow from '../models/Follow';
import { getUsersCollection } from '../db/connection';
import { toObjectId } from '../utils/object-id';

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

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Valid user id is required' });
      return;
    }

    if (mongoose.connection.readyState !== 1) {
      res.status(500).json({ message: 'Database not connected' });
      return;
    }

    const user = await getUsersCollection().findOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { projection: { name: 1, image: 1 } }
    );

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const [postCount, followersCount, followingCount, isFollowing] =
      await Promise.all([
        Post.countDocuments({ author: id }),
        Follow.countDocuments({ following: id }),
        Follow.countDocuments({ follower: id }),
        req.userId
          ? Follow.exists({ follower: req.userId, following: id })
          : Promise.resolve(null),
      ]);

    res.status(200).json({
      id: user._id,
      name: user.name ?? null,
      image: user.image ?? null,
      postCount,
      followersCount,
      followingCount,
      isFollowing: Boolean(isFollowing),
      isSelf: req.userId === id,
    });
  } catch (e) {
    console.error('Error fetching profile:', e);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}

export async function toggleFollow(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.body;
    const followerId = req.userId;

    if (!followerId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ message: 'Valid userId is required' });
      return;
    }

    if (userId === followerId) {
      res.status(400).json({ message: 'You cannot follow yourself' });
      return;
    }

    if (mongoose.connection.readyState !== 1) {
      res.status(500).json({ message: 'Database not connected' });
      return;
    }

    const targetUser = await getUsersCollection().findOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      { projection: { _id: 1 } }
    );

    if (!targetUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const existing = await Follow.findOne({
      follower: toObjectId(followerId),
      following: toObjectId(userId),
    });

    if (existing) {
      await Follow.deleteOne({ _id: existing._id });
      res.status(200).json({ following: false });
      return;
    }

    await Follow.create({
      follower: toObjectId(followerId),
      following: toObjectId(userId),
    });
    res.status(200).json({ following: true });
  } catch (e) {
    console.error('Error toggling follow:', e);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
