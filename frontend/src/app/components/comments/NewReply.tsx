'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import classNames from 'classnames';
import { useCommentMutations } from '../../utils/commentMutations';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import Avatar from '../ui/Avatar';
import { useEnterSubmit } from '@/app/utils/formSubmit';

interface ReplyProps {
  postId: string;
  parentCommentId: string;
  content: string;
}

const NewReply: React.FC<ReplyProps> = ({ parentCommentId }) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();
  const [content, setContent] = useState('');
  const { newReplyMutation } = useCommentMutations();
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
      newReplyMutation.mutate(
        {
          postId: postId, // This will be handled by the mutation hook
          parentCommentId,
          content,
        },
        {
          onSuccess: () => {
            setContent('');
            setLoading(false);
          },
          onError: () => {
            toast.error('Failed to post reply. Please try again.');
            setLoading(false);
          },
        }
      );
    }
  };

  return (
    <div>
      <div className="flex flex-row border-t border-border px-4 pt-2">
        <div className="mr-5 w-8 min-w-[32px] flex-shrink-0 pt-2">
          <Avatar
            src={session?.user?.image}
            alt={session?.user?.name ?? 'Profile'}
            size="md"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (loading || content.trim() === '') return;

              handleSubmit();
              setContent('');
            }}
          >
            <textarea
              ref={textareaRef}
              className="ml-1 h-7 w-full resize-none overflow-hidden bg-transparent py-0.5 text-[15px] text-content placeholder-muted focus:outline-none"
              onKeyDown={useEnterSubmit({
                loading,
                content,
                onSubmit: handleSubmit,
              })}
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

            <div className="mt-1.5 h-[40px] w-full py-0.5">
              <div className="flex h-full w-full flex-row items-center justify-between">
                <div className="flex gap-2">
                  <button
                    className={classNames(
                      'flex h-8 items-center justify-center rounded-full px-4 text-center text-[15px] font-bold transition duration-300',
                      {
                        'bg-primary text-white hover:bg-primary-hover':
                          !loading && content.trim() !== '',
                        'cursor-not-allowed bg-primary text-white opacity-50':
                          loading || content.trim() === '',
                      }
                    )}
                    onClick={handleSubmit}
                    disabled={loading || content.trim() === ''}
                  >
                    Reply
                  </button>
                </div>
                <p
                  className={`mt-1 text-right text-xs ${content.length > 380 ? 'text-like' : 'text-muted'}`}
                >
                  {content.length}/380
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewReply;
