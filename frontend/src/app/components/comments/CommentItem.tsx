'use client';

import type { Comment } from '../../types/Comment';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getComment } from '@/app/utils/fetchInfo';
import Dropdown from '../posts/DropDownMenu';
import LikeButton from '../ui/LikeButton';
import { useParams } from 'next/navigation';


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

  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ['comment', comment.id],
      queryFn: () => getComment(postId, comment.id),
    });
  }, [postId, comment.id, queryClient]);

  return (
    <div className="relative flex flex-row p-4 border-t border-gray-700 bg-black m-0 w-full min-h-[80px] overflow-visible">
      <img
        className="flex items-stretch min-w-8 h-8 rounded-full mr-2"
        src={comment?.authorImage ?? '/Logo.png'}
        referrerPolicy="no-referrer"
        alt={`${comment.name}'s profile`}
      />
      <div className="flex flex-col flex-1">
        <div className="flex items-center mb-0 text-sm text-gray-400">
          <span className="font-bold">{comment.name}</span>
          <span className="mx-1">·</span>
          <span>
            {new Date(comment.createdAt).toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
        <div className="bg-transparent text-sm">
          <div className="text-white break-all whitespace-pre-wrap">
            {showMore
              ? comment.content
              : `${comment.content.substring(0, 300)}`}
            {comment.content.length > 300 && (
              <button
                onClick={() => setShowMore(!showMore)}
                className="text-blue-500 interactive-element"
              >
                {showMore ? '  Show less' : '  Read more'}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2 like-button">
          <LikeButton
            type="comment"
            targetId={comment.id}
            authorId={authorId}
            initialLikes={comment.likes}
          />
          <p className="text-xs text-gray-400 ">
            Reply
          </p>
        </div>
      </div>
      <div className="absolute top-2 right-2 mr-2 interactive-element">
        <button
          className="p-1 rounded-full hover:bg-[#1D9BF0] hover:bg-opacity-20 transition-colors"
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <svg
            fill="#9ca3af"
            height="14px"
            width="14px"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            stroke="#9ca3af"
            strokeWidth="0.848"
          >
            <path d="M8,6.5A1.5,1.5,0,1,1,6.5,8,1.5,1.5,0,0,1,8,6.5ZM.5,8A1.5,1.5,0,1,0,2,6.5,1.5,1.5,0,0,0,.5,8Zm12,0A1.5,1.5,0,1,0,14,6.5,1.5,1.5,0,0,0,12.5,8Z"></path>
          </svg>
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
