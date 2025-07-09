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
    const comments = await Comment.find()
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
          authorImage: user?.image || null, // Default placeholder if no image
        };
      })
    );

    // Total number of comments
    const totalComments = await Comment.countDocuments();
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

async function findCommentsByPost(req: Request, res: Response): Promise<void> {
  try {
    const { postId } = req.params;
    const { page = '1', limit = '10' } = req.query;

    if (!postId) {
      res.status(400).json({ message: 'Post ID is required' });
      return;
    }

    if (mongoose.connection.readyState !== 1) {
      res.status(500).json({ message: 'Database not connected' });
      return;
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Fetch post to get comment IDs
    const post = await Post.findById(postId).select('comments').lean();
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    // Fetch paginated comments
    const comments = await Comment.find({
      _id: { $in: post.comments },
    })
      .sort({ createdAt: -1 }) //Newest first
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Fetch author images
    const authorIds = comments.map((comment) => comment.author);
    //@ts-ignore
    const users = await mongoose.connection.db
      .collection('users')
      .find({ _id: { $in: authorIds } })
      .project({ _id: 1, image: 1 })
      .toArray();

    const userImageMap = new Map(
      users.map((user) => [user._id.toString(), user.image])
    );

    const commentsWithUserData = comments.map((comment) => ({
      id: comment._id,
      content: comment.content,
      name: comment.name,
      createdAt: comment.createdAt,
      likes: comment.likes,
      author: comment.author,
      authorImage: userImageMap.get(comment.author.toString()) || null,
    }));

    // Total comments for pagination
    const totalComments = await Comment.countDocuments({
      _id: { $in: post.comments },
    });
    const totalPages = Math.ceil(totalComments / limitNum);

    res.status(200).json({
      comments: commentsWithUserData,
      page: pageNum,
      limit: limitNum,
      totalComments,
      totalPages,
    });
  } catch (error) {
    console.error('Error fetching comments by post:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}

async function findCommentById(req: Request, res: Response): Promise<void> {
  try {
    const { commentId } = req.params;

    if (!commentId) {
      res.status(400).json({ message: 'Comment ID is required' });
      return;
    }

    if (mongoose.connection.readyState !== 1) {
      res.status(500).json({ message: 'Database not connected' });
      return;
    }

    const comment = await Comment.findById(commentId).lean();

    if (!comment) {
      res.status(404).json({ message: 'Comment not found' });
      return;
    }

    // Fetch author image from the users collection
    //@ts-ignore
    const user = await mongoose.connection.db
      .collection('users')
      .findOne(
        { _id: new mongoose.Types.ObjectId(comment.author) },
        { projection: { image: 1 } }
      );

    const commentWithUserData = {
      id: comment._id,
      content: comment.content,
      name: comment.name,
      createdAt: comment.createdAt,
      likes: comment.likes,
      author: comment.author,
      authorImage: user?.image || null,
    };

    res.status(200).json(commentWithUserData);
  } catch (error) {
    console.error('Error finding comment:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}

async function editComment(req: Request, res: Response): Promise<void> {
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

    await Comment.findByIdAndDelete(commentId);

    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function getLikes(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: 'Comment ID is required' });
      return;
    }

    const comment = await Comment.findById(id).lean();
    if (!comment) {
      res.status(404).json({ message: 'Comment not found' });
      return;
    }

    // Fetch user names based on ObjectIDs in 'likes'
    //@ts-ignore
    const users = await mongoose.connection.db
      .collection('users')
      .find({ _id: { $in: comment.likes } })
      .project({ name: 1 })
      .toArray();

    res.status(200).json({ likes: users });
  } catch (e) {
    console.error('Error fetching comment likes:', e);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

async function toggleLike(req: Request, res: Response): Promise<void> {
  try {
    const { id, authorId } = req.body;

    if (!id || !authorId) {
      res
        .status(400)
        .json({ message: 'Comment ID and author ID are required' });
      return;
    }

    if (mongoose.connection.readyState !== 1) {
      res.status(500).json({ message: 'Database not connected' });
      return;
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      res.status(404).json({ message: 'Comment not found' });
      return;
    }

    const updateAction = comment.likes.includes(authorId)
      ? { $pull: { likes: authorId } } // Remove like
      : { $addToSet: { likes: authorId } }; // Add like

    await Comment.findByIdAndUpdate(id, updateAction, { new: true });

    res.status(200).json({
      message: comment.likes.includes(authorId)
        ? 'Comment unliked'
        : 'Comment liked',
    });
  } catch (e) {
    console.error('Error liking/unliking comment:', e);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}

export {
  allComments,
  findCommentsByPost,
  findCommentById,
  editComment,
  deleteComment,
  getLikes,
  toggleLike,
};
