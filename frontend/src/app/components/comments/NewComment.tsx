import React, { useState } from 'react';
import LoadingBar from '../ui/CustomLoadBar';
import { useSession } from 'next-auth/react';
import classNames from 'classnames';
import CustomToaster from '../ui/CustomToaster';
import Avatar from '../ui/Avatar';
import { useParams } from 'next/navigation';
import { useCommentMutations } from '../../utils/commentMutations';
import { useEnterSubmit } from '@/app/utils/formSubmit';

const NewComment = () => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const progress = 0;
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const [content, setContent] = useState('');
  const { id } = useParams<{ id: string }>();
  const email = session?.user?.email || '';
  const { newCommentMutation } = useCommentMutations();
  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '28px';
    }
  };

  const handleSubmit = () => {
    if (content.trim()) {
      setLoading(true);
      newCommentMutation.mutate(
        { postId: id, content, email },
        {
          onSuccess: () => {
            setContent('');
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
    <>
      <h2 className="border-b border-border p-4 text-xl font-bold text-content">
        Comments
      </h2>
      <div className="flex w-full min-h-[116px] items-center justify-center">
        <LoadingBar progress={progress} />
        <div className="mx-auto flex w-full flex-row border-b border-border px-4 pt-2">
          <div className="mr-2 w-10 min-w-[40px] flex-shrink-0 pt-2">
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

                newCommentMutation.mutate({ postId: id, content, email });
                setContent('');
              }}
            >
              <textarea
                ref={textareaRef}
                className="h-7 w-full resize-none overflow-hidden bg-transparent py-0.5 text-[15px] text-content placeholder-muted focus:outline-none"
                onKeyDown={useEnterSubmit({
                  loading,
                  content,
                  onSubmit: handleSubmit,
                })}
                placeholder="What's up?"
                maxLength={380}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  const value = target.value;
                  const minHeight = 28;
                  const maxHeight = 300;

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

              <div className="mt-1.5 h-[48px] w-full py-0.5">
                <div className="flex h-full w-full flex-row items-center justify-between">
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
                    onClick={() => {
                      newCommentMutation.mutate({ postId: id, content, email });
                      setContent('');
                    }}
                    disabled={loading || content.trim() === ''}
                  >
                    Post
                  </button>
                  <p
                    className={`mt-1 text-right text-xs ${
                      content.length > 380 ? 'text-like' : 'text-muted'
                    }`}
                  >
                    {content.length}/380
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
      <CustomToaster />
    </>
  );
};

export default NewComment;
