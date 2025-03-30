import mongoose from 'mongoose';
import Post from '../models/Post';
import Comment from '../models/Comment';
import { Request, Response } from 'express';
import { getUserIdByEmail, getUserNameByID } from './user-controller';

async function allComments(req: Request, res: Response): Promise<void> {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(500).json({ message: 'Database not connected' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    // Fetch comments (excluding deleted ones)
    const comments = await Comment.find({ deleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Fetch author images separately from the users collection
    const commentsWithUserData = await Promise.all(
      comments.map(async (comment) => {
        //@ts-ignore
        const user = await mongoose.connection.db.collection('users').findOne(
          { _id: new mongoose.Types.ObjectId(comment.author) }, // Convert author ID to ObjectId
          { projection: { image: 1 } } // Only fetch profile image
        );

        return {
          id: comment._id,
          content: comment.content,
          name: comment.name,
          createdAt: comment.createdAt,
          likes: comment.likes,
          author: comment.author,
          authorImage: user?.image || 'https://via.placeholder.com/150', // Default placeholder if no image
        };
      })
    );

    // Total number of comments
    const totalComments = await Comment.countDocuments({ deleted: false });
    const totalPages = Math.ceil(totalComments / limit);

    res.status(200).json({
      comments: commentsWithUserData,
      totalPages,
      currentPage: page,
    });
  } catch (e) {
    console.error('Error getting comments:', e);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}

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

export { allComments, addComment, deleteComment };
