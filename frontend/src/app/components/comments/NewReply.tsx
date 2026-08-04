'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import classNames from 'classnames';
import { useCommentMutations } from '../../utils/commentMutations';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { useEnterSubmit } from '@/app/utils/formSubmit';
import { uploadImages } from '@/app/utils/imageUtils';
import FileUpload from '@/app/utils/FileUpload';

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
  const [selectedFiles, setSelectedFiles] = useState<
    { id: string; file: File }[]
  >([]);
  const { newReplyMutation } = useCommentMutations();
  const params = useParams();
  const postId = params.id as string;
  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '28px';
    }
  };

  const handleImagesUploaded = (files: File[]) => {
    setSelectedFiles(files.map((file) => ({ id: crypto.randomUUID(), file })));
  };

  const removeImage = (fileId: string) => {
    setSelectedFiles((files) => files.filter((f) => f.id !== fileId));
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;

    if (!session?.user) {
      toast('Sign in to reply');
      return;
    }

    setLoading(true);

    let images: string[] = [];
    try {
      images = await uploadImages(selectedFiles.map((f) => f.file));
    } catch {
      toast.error('Image upload failed. Please try again.');
      setLoading(false);
      return;
    }

    newReplyMutation.mutate(
      {
        postId: postId, // This will be handled by the mutation hook
        parentCommentId,
        content,
        images,
      },
      {
        onSuccess: () => {
          setContent('');
          setSelectedFiles([]);
          setLoading(false);
        },
        onError: () => {
          toast.error('Failed to post reply. Please try again.');
          setLoading(false);
        },
      }
    );
  };

  return (
    <div>
      <div className="flex flex-row border-t border-border px-4 pt-2">
        <Link href="/profile" className="mr-3 flex-shrink-0 pt-2">
          <Avatar
            src={session?.user?.image}
            alt={session?.user?.name ?? 'Profile'}
            size="md"
          />
        </Link>
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

            {selectedFiles.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {selectedFiles.map(({ id: fileId, file }) => (
                  <div key={fileId} className="group relative aspect-video">
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Preview"
                      loading="lazy"
                      className="h-full w-full rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(fileId)}
                      className="absolute right-2 top-2 rounded-full bg-black/75 p-1 text-white/70 transition-colors hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-1.5 h-[40px] w-full py-0.5">
              <div className="flex h-full w-full flex-row items-center justify-between">
                <FileUpload onImagesUploaded={handleImagesUploaded} />
                <div className="flex items-center gap-3">
                  <p
                    className={`mt-1 text-right text-xs ${content.length > 380 ? 'text-like' : 'text-muted'}`}
                  >
                    {content.length}/380
                  </p>
                  <button
                    className={classNames(
                      'flex h-8 w-[76px] items-center justify-center rounded-full px-4 text-center text-[15px] font-bold transition duration-300',
                      {
                        'bg-btn text-btn-fg hover:bg-btn-hover':
                          !loading && content.trim() !== '',
                        'cursor-not-allowed bg-btn text-btn-fg opacity-50':
                          loading || content.trim() === '',
                      }
                    )}
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading || content.trim() === ''}
                  >
                    {loading ? (
                      <output
                        aria-label="Posting"
                        className="h-4 w-4 animate-spin rounded-full border-2 border-btn-fg/40 border-t-btn-fg"
                      />
                    ) : (
                      'Reply'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewReply;
