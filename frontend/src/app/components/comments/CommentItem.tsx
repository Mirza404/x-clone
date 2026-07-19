'use client';

import type { Comment } from '../../types/Comment';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getComment } from '@/app/utils/fetchInfo';
import Dropdown from '../posts/DropDownMenu';
import LikeButton from '../ui/LikeButton';
import Avatar from '../ui/Avatar';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { universalHandleClick } from '@/app/utils/handleClick';
import { toHandle } from '@/app/utils/handle';
import { relativeTime } from '@/app/utils/relativeTime';
import { MoreHorizontal } from 'lucide-react';

const CommentItem = ({
  comment,
  onDelete,
  onEdit,
}: {
  comment: Comment;
  onDelete: () => void;
  onEdit: () => void;
}) => {
  const { data: session } = useSession();
  const [showMore, setShowMore] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const authorId: string = session?.user?.id ?? '';
  const queryClient = useQueryClient();
  const params = useParams();
  const postId = params.id as string;
  const router = useRouter();
  const pathname = usePathname();
  const isCurrentPage = useMemo(
    () => pathname === `/posts/${postId}/comment/${comment.id}`,
    [pathname, postId, comment.id]
  );

  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ['comment', comment.id],
      queryFn: () => getComment(postId, comment.id),
    });
  }, [postId, comment.id, queryClient]);

  const handle = toHandle(comment.name);

  return (
    <div
      className="post-hover relative flex w-full min-h-[80px] cursor-pointer flex-row gap-3 border-b border-border p-4"
      onClick={
        !isCurrentPage
          ? (e) =>
              universalHandleClick(e, router, 'comment', postId, comment.id)
          : undefined
      }
    >
      <Avatar
        src={comment?.authorImage}
        alt={`${comment.name}'s profile`}
        size="lg"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-1 text-[15px] text-muted">
          <span className="font-bold text-content hover:underline">
            {comment.name}
          </span>
          {handle && <span className="truncate">{handle}</span>}
          <span aria-hidden="true">·</span>
          <span className="flex-shrink-0">
            {relativeTime(comment.createdAt)}
          </span>
        </div>
        <div className="text-[15px] leading-5 text-content break-words whitespace-pre-wrap">
          {showMore
            ? comment.content
            : `${comment.content.substring(0, 300) ?? ''}`}
          {comment.content.length > 300 && (
            <button
              onClick={() => setShowMore(!showMore)}
              className="interactive-element ml-1 font-bold text-primary hover:underline"
            >
              {showMore ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
        <div className="like-button mt-2 flex items-center gap-4">
          <LikeButton
            type="comment"
            targetId={comment.id}
            authorId={authorId}
            initialLikes={comment.likes}
          />
        </div>
      </div>
      <div className="interactive-element absolute right-2 top-2">
        <button
          className="rounded-full p-1.5 text-muted transition-colors hover:bg-primary-bg hover:text-primary"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-label="More options"
        >
          <MoreHorizontal className="h-[18px] w-[18px]" />
        </button>
        {dropdownOpen && session?.user?.id === comment.author && (
          <div className="dropdown-menu">
            <Dropdown
              type="comment"
              onDelete={onDelete}
              onEdit={onEdit}
              onClose={() => setDropdownOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentItem;
