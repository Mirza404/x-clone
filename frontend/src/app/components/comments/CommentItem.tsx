'use client';

import type { Comment } from '../../types/Comment';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getComment } from '@/app/utils/fetchInfo';
import Dropdown from '../posts/DropDownMenu';
import LikeButton from '../ui/LikeButton';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { universalHandleClick } from '@/app/utils/handleClick';
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

  return (
    <div
      className="post-hover relative flex w-full min-h-[80px] cursor-pointer flex-row gap-3 border-b border-x-border p-4"
      onClick={
        !isCurrentPage
          ? (e) =>
              universalHandleClick(e, router, 'comment', postId, comment.id)
          : undefined
      }
    >
      <img
        className="h-12 w-12 flex-shrink-0 rounded-full"
        src={comment?.authorImage ?? '/Logo.png'}
        referrerPolicy="no-referrer"
        alt={`${comment.name}'s profile`}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1 text-[15px] text-x-text-secondary">
          <span className="font-bold text-x-text hover:underline">
            {comment.name}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {new Date(comment.createdAt).toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
        <div className="text-[15px] leading-5 text-x-text break-all whitespace-pre-wrap">
          {showMore
            ? comment.content
            : `${comment.content.substring(0, 300) ?? ''}`}
          {comment.content.length > 300 && (
            <button
              onClick={() => setShowMore(!showMore)}
              className="interactive-element ml-1 font-bold text-x-blue hover:underline"
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
          className="rounded-full p-1.5 text-x-text-secondary transition-colors hover:bg-x-blue-bg hover:text-x-blue"
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
