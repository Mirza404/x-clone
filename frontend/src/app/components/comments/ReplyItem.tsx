'use client';

import type { Comment } from '../../types/Comment';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import Dropdown from '../posts/DropDownMenu';
import LikeButton from '../ui/LikeButton';
import { useParams } from 'next/navigation';

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

  return (
    <div className="relative flex flex-row p-3 ml-10 border-l-2 border-gray-600 pl-4 bg-gray-900 bg-opacity-30 m-0 w-full min-h-[70px] overflow-visible">
      <img
        className="flex items-stretch min-w-6 h-6 rounded-full mr-2"
        src={reply?.authorImage ?? '/Logo.png'}
        referrerPolicy="no-referrer"
        alt={`${reply.name}'s profile`}
      />
      <div className="flex flex-col flex-1">
        <div className="flex items-center mb-0 text-xs text-gray-400">
          <span className="font-bold">{reply.name}</span>
          <span className="mx-1">·</span>
          <span>
            {new Date(reply.createdAt).toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
        <div className="bg-transparent text-sm">
          {reply.content ? (
            <div className="text-white break-all whitespace-pre-wrap">
              {showMore ? reply.content : `${reply.content.substring(0, 200)}`}
              {reply.content.length > 200 && (
                <button
                  onClick={() => setShowMore(!showMore)}
                  className="text-blue-500 interactive-element"
                >
                  {showMore ? '  Show less' : '  Read more'}
                </button>
              )}
            </div>
          ) : (
            <div className="text-gray-500 italic">No content</div>
          )}
        </div>
        <div className="flex items-center gap-3 mt-2 like-button">
          <LikeButton
            type="comment"
            targetId={reply.id}
            authorId={authorId}
            initialLikes={reply.likes}
          />
        </div>
      </div>
      <div className="absolute top-2 right-2 mr-2 interactive-element">
        <button
          className="p-1 rounded-full hover:bg-[#1D9BF0] hover:bg-opacity-20 transition-colors"
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <svg
            fill="#9ca3af"
            height="12px"
            width="12px"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            stroke="#9ca3af"
            strokeWidth="0.848"
          >
            <path d="M8,6.5A1.5,1.5,0,1,1,6.5,8,1.5,1.5,0,0,1,8,6.5ZM.5,8A1.5,1.5,0,1,0,2,6.5,1.5,1.5,0,0,0,.5,8Zm12,0A1.5,1.5,0,1,0,14,6.5,1.5,1.5,0,0,0,12.5,8Z"></path>
          </svg>
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
