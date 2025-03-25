import mongoose from 'mongoose';
import Post from '../models/Post';
import Comment from '../models/Comment';
import { Request, Response } from 'express';
import { getUserIdByEmail, getUserNameByID } from './user-controllers';

async function addComment(req: Request, res: Response): Promise<void> {
  try {
    const { postId } = req.params;
    const { content, email } = req.body;

    if (!postId || !content || !email) {
      res
        .status(400)
        .json({ message: 'Post ID, content, and email are required' });
      return;
    }

    const author = await getUserIdByEmail(email);
    if (!author) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const name = await getUserNameByID(author.toString().trim());
    const newComment = new Comment({
      content,
      author,
      name,
      createdAt: new Date(),
      likes: [],
    });

    await newComment.save();

    await Post.findByIdAndUpdate(postId, {
      $push: { comments: newComment._id },
    });

    res
      .status(201)
      .json({ message: 'Comment added successfully', comment: newComment });
  } catch (e) {
    console.error('Error adding comment:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function deleteComment(req: Request, res: Response): Promise<void> {
  try {
    const { commentId } = req.params;
    if (!commentId) {
      res.status(400).json({ message: 'Comment ID is required' });
      return;
    }

    await Comment.findByIdAndUpdate(commentId, { deleted: true, content: '' });

    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export { addComment, deleteComment };
