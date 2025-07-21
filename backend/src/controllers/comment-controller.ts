import mongoose from 'mongoose';
import Post from '../models/Post';
import Comment from '../models/Comment';
import { Request, Response } from 'express';
import { getUserIdByEmail, getUserNameByID } from './user-controller';
import { LeanComment } from 'src/types/LeanComment';

async function allComments(req: Request, res: Response): Promise<void> {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(500).json({ message: 'Database not connected' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    const comments = (await Comment.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('replies') // only populate replies, not author
      .lean()) as LeanComment[];

    const authorIds = new Set<string>();
    for (const comment of comments) {
      authorIds.add(comment.author.toString());
      for (const reply of comment.replies ?? []) {
        authorIds.add(reply.author.toString());
      }
    }

    //@ts-ignore
    const users = await mongoose.connection.db
      .collection('users')
      .find({
        _id: {
          $in: Array.from(authorIds).map(
            (id) => new mongoose.Types.ObjectId(id)
          ),
        },
      })
      .project({ _id: 1, image: 1 })
      .toArray();

    const userImageMap = new Map(
      users.map((user) => [user._id.toString(), user.image])
    );

    // Fetch author images separately from the users collection
    const commentsWithUserData = comments.map((comment) => ({
      id: comment._id,
      content: comment.content,
      name: comment.name,
      postId: comment.postId,
      parentComment: comment.parentComment,
      createdAt: comment.createdAt,
      likes: comment.likes,
      author: comment.author,
      authorImage: userImageMap.get(comment.author.toString()) || null,
      replies: (comment.replies ?? []).map((reply: any) => ({
        id: reply._id,
        content: reply.content,
        name: reply.name,
        postId: reply.postId,
        parentComment: reply.parentComment,
        createdAt: reply.createdAt,
        likes: reply.likes,
        author: reply.author,
        authorImage: userImageMap.get(reply.author.toString()) || null,
        replies: reply.replies, // (should usually be empty since this is a 2-level system)
      })),
    }));

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

    // Get the post and its comments
    const post = await Post.findById(postId).select('comments').lean();
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    // Get top-level comments for pagination
    const comments = (await Comment.find({
      _id: { $in: post.comments },
      parentComment: null,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('replies') // only populate replies, not author
      .lean()) as LeanComment[];

    // Collect all author IDs from comments and replies
    const authorIds = new Set<string>();
    for (const comment of comments) {
      authorIds.add(comment.author.toString());
      for (const reply of comment.replies ?? []) {
        authorIds.add(reply.author.toString());
      }
    }

    // Fetch user images manually
    //@ts-ignore
    const users = await mongoose.connection.db
      .collection('users')
      .find({
        _id: {
          $in: Array.from(authorIds).map(
            (id) => new mongoose.Types.ObjectId(id)
          ),
        },
      })
      .project({ _id: 1, image: 1 })
      .toArray();

    const userImageMap = new Map(
      users.map((user) => [user._id.toString(), user.image])
    );

    // Attach authorImage to comments and replies
    const commentsWithUserData = comments.map((comment) => ({
      id: comment._id,
      content: comment.content,
      name: comment.name,
      postId: comment.postId,
      parentComment: comment.parentComment,
      createdAt: comment.createdAt,
      likes: comment.likes,
      author: comment.author,
      authorImage: userImageMap.get(comment.author.toString()) || null,
      replies: (comment.replies ?? []).map((reply: any) => ({
        id: reply._id,
        content: reply.content,
        name: reply.name,
        postId: reply.postId,
        parentComment: reply.parentComment,
        createdAt: reply.createdAt,
        likes: reply.likes,
        author: reply.author,
        authorImage: userImageMap.get(reply.author.toString()) || null,
        replies: reply.replies, // (should usually be empty since this is a 2-level system)
      })),
    }));

    const totalComments = await Comment.countDocuments({
      _id: { $in: post.comments },
      parentComment: null,
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
    const { postId, commentId } = req.params;

    if (!commentId) {
      res.status(400).json({ message: 'Comment ID is required' });
      return;
    }

    if (mongoose.connection.readyState !== 1) {
      res.status(500).json({ message: 'Database not connected' });
      return;
    }

    const post = await Post.findById(postId).select('comments').lean();
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    // Try to find as a top-level comment
    let comment = await Comment.findOne({
      $and: [{ _id: commentId }, { _id: { $in: post.comments } }],
    })
      .populate({ path: 'replies', options: { sort: { createdAt: -1 } } }) // sort replies by newest
      .lean();

    // If not found, try to find as a reply (not top-level)
    if (!comment) {
      comment = await Comment.findOne({
        _id: commentId,
        parentComment: { $ne: null },
      })
        .populate({ path: 'replies', options: { sort: { createdAt: -1 } } }) // sort replies by newest
        .lean();
    }

    if (!comment) {
      res.status(404).json({ message: 'Comment not found' });
      return;
    }

    const authorIds = new Set<string>();
    authorIds.add(comment.author.toString());
    for (const reply of comment.replies ?? []) {
      //only add if reply is an object and has author
      if (reply && typeof reply === 'object' && 'author' in reply) {
        authorIds.add((reply as any).author.toString());
      }
    }

    //@ts-ignore
    const users = await mongoose.connection.db
      .collection('users')
      .find({
        _id: {
          $in: Array.from(authorIds).map(
            (id) => new mongoose.Types.ObjectId(id)
          ),
        },
      })
      .project({ _id: 1, image: 1 })
      .toArray();

    const userImageMap = new Map(
      users.map((user) => [user._id.toString(), user.image])
    );

    // Attach authorImage to comment and replies
    const commentWithUserData = {
      id: comment._id,
      content: comment.content,
      name: comment.name,
      postId: comment.postId,
      parentComment: comment.parentComment,
      createdAt: comment.createdAt,
      likes: comment.likes,
      author: comment.author,
      authorImage: userImageMap.get(comment.author.toString()) || null,
      replies: (comment.replies ?? []).map((reply: any) => ({
        id: reply._id,
        content: reply.content,
        name: reply.name,
        postId: reply.postId,
        parentComment: reply.parentComment,
        createdAt: reply.createdAt,
        likes: reply.likes,
        author: reply.author,
        authorImage: userImageMap.get(reply.author.toString()) || null,
        replies: reply.replies,
      })),
    };

    res.status(200).json([commentWithUserData]);
  } catch (error) {
    console.error('Error finding comment:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}

async function createComment(req: Request, res: Response): Promise<void> {
  try {
    const { postId } = req.params;
    const { content, email, parentCommentId } = req.body;

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
      postId,
      parentComment: parentCommentId || null,
      replies: [],
      createdAt: new Date(),
      likes: [],
    });

    await newComment.save();

    if (parentCommentId) {
      await Comment.findByIdAndUpdate(parentCommentId, {
        $push: { replies: newComment._id },
      });
    } else {
      // It's a top-level comment → push to the post's comments
      await Post.findByIdAndUpdate(postId, {
        $push: { comments: newComment._id },
      });
    }

    res.status(201).json({
      message: parentCommentId
        ? 'Reply added successfully'
        : 'Comment added successfully',
      comment: newComment,
    });
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

async function updateComment(req: Request, res: Response): Promise<void> {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    if (!commentId || !content) {
      res.status(400).json({ message: 'Comment ID and content are required' });
      return;
    }
    if (mongoose.connection.readyState !== 1) {
      res.status(500).json({ message: 'Database not connected' });
      return;
    }
    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { content, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedComment) {
      res.status(404).json({ message: 'Comment not found' });
      return;
    }
    res.status(200).json({
      message: 'Comment updated successfully',
      comment: updatedComment,
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal server error' });
    }
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
  createComment,
  deleteComment,
  updateComment,
  getLikes,
  toggleLike,
};
