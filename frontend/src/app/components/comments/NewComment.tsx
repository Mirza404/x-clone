import React, { useState } from 'react';
import LoadingBar from '../ui/CustomLoadBar';
import { useSession } from 'next-auth/react';
import classNames from 'classnames';
import CustomToaster from '../ui/CustomToaster';
import { useParams } from 'next/navigation';
import { useCommentMutations } from './mutations';
import { useEnterSubmit } from '@/app/utils/formSubmit';

const NewComment = () => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [progress, setProgress] = useState(0);
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
      <h2 className="text-xl font-bold p-4 border-l border-r border-gray-700">
        Comments
      </h2>
      <div className="flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm w-[598px] min-h-[116px]">
        <LoadingBar progress={progress} />
        <div className="flex flex-row bg-black bg-opacity-50 backdrop-blur-sm mt-0 mx-auto px-4 pt-2 border border-gray-700 shadow-lg w-[598px]">
          <div className="pt-2 mr-2 min-w-[40px] w-[40px] flex-shrink-0">
            <img
              className="flex items-stretch w-9 h-9 rounded-full mr-2"
              src={session?.user?.image ?? '/Logo.png'}
              referrerPolicy="no-referrer"
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
            />
          </div>
          <div className="flex flex-col py-3 flex-1 min-w-0">
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
                className="w-full h-7 py-0.5 text-white bg-black rounded-lg focus:outline-none text-sm overflow-hidden resize-none"
                onKeyDown={useEnterSubmit({
                  loading,
                  content,
                  onSubmit: handleSubmit,
                })}
                placeholder="What's up?"
                maxLength={380} // ✅ Enforces the limit at the input level
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

              <div className="w-full h-[48px] py-0.5 mt-1.5">
                <div className="flex flex-row w-full h-full items-center justify-between">
                  <button
                    className={classNames(
                      'flex justify-center items-center text-center text-sm rounded-full px-3 h-8 font-bold transition duration-300',
                      {
                        'bg-white text-black hover:bg-gray-300':
                          !loading && content.trim() !== '',
                        'bg-white text-black opacity-70 cursor-not-allowed':
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
                    className={`text-xs text-right mt-1 ${
                      content.length > 380 ? 'text-red-500' : 'text-gray-400'
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
