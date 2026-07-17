'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { uploadImages } from '../../utils/imageUtils';
import FileUpload from '../../utils/FileUpload';
import LoadingBar from '../ui/CustomLoadBar';
import { X } from 'lucide-react';

export default function MobileNewPost({ onClose }: { onClose: () => void }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const { data: session } = useSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;

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

      // First upload images
      const uploadedUrls = await uploadImages(selectedFiles);

      // Then create post
      setProgress(50); // Start second 50% for post creation
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
    <div className="fixed inset-0 z-50 flex flex-col bg-x-black">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-x-border p-4">
        <button onClick={onClose} className="text-x-text">
          <X className="h-6 w-6" />
        </button>
        <button
          className={`flex items-center justify-center rounded-full px-4 py-1.5 text-center text-[15px] font-bold transition duration-300 ${
            !loading && content.trim() !== ''
              ? 'bg-white text-black hover:bg-white/90'
              : 'cursor-not-allowed bg-white text-black opacity-50'
          }`}
          onClick={() => newPostMutation.mutate()}
          disabled={loading || content.trim() === ''}
        >
          Post
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 p-4">
        <div className="mr-3 flex-shrink-0">
          <img
            className="h-10 w-10 rounded-full"
            src={session?.user?.image ?? '/Logo.png'}
            referrerPolicy="no-referrer"
            alt="Profile"
          />
        </div>
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            className="mt-1 h-14 w-full resize-none bg-transparent text-[17px] text-x-text placeholder-x-text-secondary focus:outline-none"
            placeholder="What's happening?"
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
          />

          {/* Images */}
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
                    className="absolute right-2 top-2 rounded-full bg-black/75 p-1 text-x-text-secondary transition-colors hover:text-x-text"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-x-border p-4">
        <div className="flex items-center">
          <FileUpload onImagesUploaded={handleImagesUploaded} />
        </div>
        {loading && <LoadingBar progress={progress} />}
      </div>
    </div>
  );
}
