'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import classNames from 'classnames';
import { useCommentMutations } from './mutations';
import { useParams } from 'next/navigation';

interface ReplyProps {
  postId: string;
  parentCommentId: string;
  content: string;
  email: string;
  onCancel: () => void;
}

const Reply: React.FC<ReplyProps> = ({ parentCommentId, onCancel }) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();
  const [content, setContent] = useState('');
  const email = session?.user?.email || '';
  const { newPostMutation } = useCommentMutations();
  const params = useParams();
  const postId = params.id as string;

  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '28px';
    }
  };

  const handleSubmit = () => {
    if (content.trim()) {
      setLoading(true);
      newPostMutation.mutate(
        {
          postId: postId, // This will be handled by the mutation hook
          parentCommentId,
          content,
          email,
        },
        {
          onSuccess: () => {
            setContent('');
            onCancel();
            setLoading(false);
          },
          onError: () => {
            setLoading(false);
          },
        }
      );
    }
  };

  return (
    <div className="mt-3 ml-10 border-l-2 border-gray-600 pl-4">
      <div className="flex flex-row bg-black bg-opacity-50 backdrop-blur-sm px-4 pt-2 border border-gray-700 rounded-lg shadow-lg">
        <div className="pt-2 mr-2 min-w-[32px] w-[32px] flex-shrink-0">
          <img
            className="flex items-stretch min-w-6 h-6 rounded-full mr-2"
            src={session?.user?.image ?? '/Logo.png'}
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex flex-col py-3 flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            className="w-full h-7 py-0.5 text-white bg-black rounded-lg focus:outline-none text-sm overflow-hidden resize-none"
            placeholder="Write a reply..."
            maxLength={380}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              const value = target.value;
              const minHeight = 28;
              const maxHeight = 200;

              if (value === '') {
                target.style.height = `${minHeight}px`;
              } else {
                target.style.height = `${minHeight}px`;
                target.style.height = `${Math.min(target.scrollHeight, maxHeight)}px`;
              }
            }}
            onFocus={resetTextareaHeight}
            onBlur={resetTextareaHeight}
            disabled={loading}
          />

          <div className="w-full h-[40px] py-0.5 mt-1.5">
            <div className="flex flex-row w-full h-full items-center justify-between">
              <div className="flex gap-2">
                <button
                  className={classNames(
                    'flex justify-center items-center text-center text-xs rounded-full px-3 h-7 font-bold transition duration-300',
                    {
                      'bg-white text-black hover:bg-gray-300':
                        !loading && content.trim() !== '',
                      'bg-white text-black opacity-70 cursor-not-allowed':
                        loading || content.trim() === '',
                    }
                  )}
                  onClick={handleSubmit}
                  disabled={loading || content.trim() === ''}
                >
                  Reply
                </button>
                <button
                  className="flex justify-center items-center text-center text-xs rounded-full px-3 h-7 font-bold transition duration-300 text-gray-400 hover:text-white hover:bg-gray-800"
                  onClick={onCancel}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
              <p
                className={`text-xs text-right mt-1 ${content.length > 380 ? 'text-red-500' : 'text-gray-400'}`}
              >
                {content.length}/380
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reply;
