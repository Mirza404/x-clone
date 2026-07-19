'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { X, Info } from 'lucide-react';
import { uploadImages } from '../../utils/imageUtils';
import FileUpload from '../../utils/FileUpload';
import LoadingBar from '../ui/CustomLoadBar';
import Avatar from '../ui/Avatar';

export default function NewPostModal({ onClose }: { onClose: () => void }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const { data: session } = useSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleImagesUploaded = (files: File[]) => {
    setSelectedFiles(files);
  };

  const removeImage = (index: number) => {
    setSelectedFiles((files) => files.filter((_, i) => i !== index));
  };

  const newPostMutation = useMutation({
    mutationFn: async () => {
      setLoading(true);
      setProgress(0);

      const uploadedUrls = await uploadImages(selectedFiles);

      setProgress(50);
      const response = await axios.post(
        `${serverUrl}/api/post/new`,
        {
          content,
          email: session?.user?.email,
          images: uploadedUrls,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      setProgress(100);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['infinitePosts'] });
      toast.success('Your post was sent.');
      setLoading(false);
      onClose();
      setContent('');
      setSelectedFiles([]);
    },
    onError: (error: Error) => {
      setLoading(false);
      setProgress(0);
      toast.error(`Error creating post: ${error.message}`);
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-8 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-[600px] flex-col rounded-2xl border border-border bg-bg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3">
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-content transition-colors hover:bg-hover"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex px-4 pb-2">
          <div className="mr-3 flex-shrink-0">
            <Avatar src={session?.user?.image} alt="Profile" size="md" />
          </div>
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              className="min-h-[80px] w-full resize-none bg-transparent text-xl text-content placeholder-muted focus:outline-none"
              placeholder="What's happening?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={380}
            />

            {selectedFiles.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="group relative aspect-video">
                    <img
                      src={URL.createObjectURL(file) || '/placeholder.svg'}
                      alt="Preview"
                      loading="lazy"
                      className="h-full w-full rounded-lg object-cover"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute right-2 top-2 rounded-full bg-black/75 p-1 text-white/70 transition-colors hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center gap-1 border-b border-border pb-3 text-[13px] font-bold text-primary">
              <Info className="h-4 w-4" />
              Everyone can reply
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3">
          <FileUpload onImagesUploaded={handleImagesUploaded} />
          <button
            className={`flex items-center justify-center rounded-full px-4 py-1.5 text-center text-[15px] font-bold transition duration-300 ${
              !loading && content.trim() !== ''
                ? 'bg-primary text-white hover:bg-primary-hover'
                : 'cursor-not-allowed bg-primary text-white opacity-50'
            }`}
            onClick={() => newPostMutation.mutate()}
            disabled={loading || content.trim() === ''}
          >
            Post
          </button>
        </div>
        {loading && <LoadingBar progress={progress} />}
      </div>
    </div>
  );
}
