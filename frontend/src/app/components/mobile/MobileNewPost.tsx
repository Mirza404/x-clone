'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { uploadImages } from '../../utils/imageUtils';
import FileUpload from '../../utils/FileUpload';
import LoadingBar from '../ui/CustomLoadBar';

export default function MobileNewPost({ onClose }: { onClose: () => void }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const { data: session } = useSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const router = useRouter();
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
    <div className="fixed inset-0 bg-black bg-opacity-100 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <button onClick={onClose} className="text-white">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <button
          className={`flex justify-center items-center text-center rounded-full px-4 py-1.5 text-sm font-bold transition duration-300 ${
            !loading && content.trim() !== ''
              ? 'bg-white text-black'
              : 'bg-white text-black opacity-50 cursor-not-allowed'
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
            className="w-8 h-8 rounded-full"
            src={session?.user?.image ?? '/Logo.png'}
            referrerPolicy="no-referrer"
            alt="Profile"
          />
        </div>
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            className="w-full h-14 bg-transparent text-white text-base focus:outline-none resize-none mt-1"
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
            <div className="grid grid-cols-2 gap-2 mt-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative group aspect-video">
                  <img
                    src={URL.createObjectURL(file) || '/placeholder.svg'}
                    alt="Preview"
                    loading="lazy"
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black bg-opacity-75 text-gray-400 hover:text-white transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center">
          <FileUpload onImagesUploaded={handleImagesUploaded} />
        </div>
        {loading && <LoadingBar progress={progress} />}
      </div>
    </div>
  );
}
