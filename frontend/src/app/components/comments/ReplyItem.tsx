'use client';

import type { Comment } from '../../types/Comment';
import { useSession } from 'next-auth/react';
import { useState, useMemo } from 'react';
import Dropdown from '../posts/DropDownMenu';
import LikeButton from '../ui/LikeButton';
import Avatar from '../ui/Avatar';
import { useParams } from 'next/navigation';
import { universalHandleClick } from '@/app/utils/handleClick';
import { toHandle } from '@/app/utils/handle';
import { relativeTime } from '@/app/utils/relativeTime';
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

  const handle = toHandle(reply.name);

  return (
    <div
      className="post-hover relative flex w-full min-h-[70px] cursor-pointer flex-row gap-3 p-3 pl-4"
      onClick={
        !isCurrentPage
          ? (e) => universalHandleClick(e, router, 'comment', postId, reply.id)
          : undefined
      }
    >
      <Avatar src={reply?.authorImage} alt={`${reply.name}'s profile`} size="sm" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-1 text-[15px] text-muted">
          <span className="font-bold text-content hover:underline">
            {reply.name}
          </span>
          {handle && <span className="truncate">{handle}</span>}
          <span aria-hidden="true">·</span>
          <span className="flex-shrink-0">{relativeTime(reply.createdAt)}</span>
        </div>
        {reply.content ? (
          <div className="text-[15px] leading-5 text-content break-words whitespace-pre-wrap">
            {showMore ? reply.content : `${reply.content.substring(0, 200)}`}
            {reply.content.length > 200 && (
              <button
                onClick={() => setShowMore(!showMore)}
                className="interactive-element ml-1 font-bold text-primary hover:underline"
              >
                {showMore ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        ) : (
          <div className="text-[15px] italic text-muted">No content</div>
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
          className="rounded-full p-1.5 text-muted transition-colors hover:bg-primary-bg hover:text-primary"
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
