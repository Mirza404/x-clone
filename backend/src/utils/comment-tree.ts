import { ObjectIdLike, toObjectId } from './object-id';

type CommentTreeNode = {
  _id: ObjectIdLike;
  replies?: ObjectIdLike[] | null;
};

function collectCommentThreadIds(
  comment: CommentTreeNode
): ReturnType<typeof toObjectId>[] {
  return [comment._id, ...(comment.replies ?? [])].map(toObjectId);
}

export { collectCommentThreadIds };
