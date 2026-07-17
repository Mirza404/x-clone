'use client';

import type { Comment } from '../../types/Comment';
import { useSession } from 'next-auth/react';
import { useState, useMemo } from 'react';
import Dropdown from '../posts/DropDownMenu';
import LikeButton from '../ui/LikeButton';
import { useParams } from 'next/navigation';
import { universalHandleClick } from '@/app/utils/handleClick';
import { usePathname, useRouter } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';

const ReplyItem = ({
  reply,
  onDelete,
  onEdit,
}: {
  reply: Comment;
  onDelete: () => void;
  onEdit: () => void;
}) => {
  const { data: session } = useSession();
  const [showMore, setShowMore] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const authorId: string = session?.user?.id ?? '';
  const params = useParams();
  const postId = params.id as string;
  const pathname = usePathname();
  const router = useRouter();
  const isCurrentPage = useMemo(
    () => pathname === `/posts/${postId}/comment/${reply.id}`,
    [pathname, postId, reply.id]
  );

  return (
    <div
      className="post-hover relative flex w-full min-h-[70px] cursor-pointer flex-row gap-3 p-3 pl-4"
      onClick={
        !isCurrentPage
          ? (e) => universalHandleClick(e, router, 'comment', postId, reply.id)
          : undefined
      }
    >
      <img
        className="h-10 w-10 flex-shrink-0 rounded-full"
        src={reply?.authorImage ?? '/Logo.png'}
        referrerPolicy="no-referrer"
        alt={`${reply.name}'s profile`}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1 text-[15px] text-x-text-secondary">
          <span className="font-bold text-x-text hover:underline">
            {reply.name}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {new Date(reply.createdAt).toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
        {reply.content ? (
          <div className="text-[15px] leading-5 text-x-text break-all whitespace-pre-wrap">
            {showMore ? reply.content : `${reply.content.substring(0, 200)}`}
            {reply.content.length > 200 && (
              <button
                onClick={() => setShowMore(!showMore)}
                className="interactive-element ml-1 font-bold text-x-blue hover:underline"
              >
                {showMore ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        ) : (
          <div className="text-[15px] italic text-x-text-secondary">
            No content
          </div>
        )}
        <div className="like-button mt-2 flex items-center gap-3">
          <LikeButton
            type="comment"
            targetId={reply.id}
            authorId={authorId}
            initialLikes={reply.likes}
          />
        </div>
      </div>
      <div className="interactive-element absolute right-2 top-2">
        <button
          className="rounded-full p-1.5 text-x-text-secondary transition-colors hover:bg-x-blue-bg hover:text-x-blue"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-label="More options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {dropdownOpen && session?.user?.id === reply.author && (
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

export default ReplyItem;
