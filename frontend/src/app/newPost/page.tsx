'use client';
import axios from 'axios';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { useMutation } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import CustomToaster from '../components/ui/CustomToaster';
import LoadingBar from '../components/ui/CustomLoadBar';
import FileUpload from '../utils/FileUpload';
import classNames from 'classnames';
import { uploadImages } from '../utils/imageUtils';
import { useEnterSubmit } from '../utils/formSubmit';

const NewPostPage = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const queryClient = useQueryClient();
  const router = useRouter();
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const { data: session } = useSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const session = await getSession();
      if (!session || !session.user) {
        router.push('/api/auth/signin');
      } else {
        if (session.user.email) {
          setEmail(session.user.email);
        }
        setLoading(false);
      }
    };

    fetchSession();
  }, [router]);

  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '28px';
    }
  };

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
          email,
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
      router.replace('/posts');
      setContent('');
      setSelectedFiles([]);
      resetTextareaHeight();
    },
    onError: (error: Error) => {
      setLoading(false);
      setProgress(0);
      toast.error(`Error creating post: ${error.message}`);
    },
  });

  return (
    <>
      <div className="hidden md:flex items-center justify-center bg-black w-full min-h-[116px] border-x border-t border-gray-800">
        <LoadingBar progress={progress} />
        <div className="flex flex-row bg-black mt-0 mx-auto px-4 pt-2 border-b border-gray-800 shadow-lg w-full">
          {/* Key fix: Make the profile picture container non-shrinkable with fixed width */}
          <div className="pt-2 mr-2 min-w-[40px] w-[40px] flex-shrink-0">
            <img
              className="w-10 h-10 rounded-full"
              src={session?.user?.image ?? '/Logo.png'}
              referrerPolicy="no-referrer"
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
              alt="Profile"
            />
          </div>
          {/* Make the content area more responsive */}
          <div className="flex flex-col py-3 flex-1 min-w-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (loading || content.trim() === '') return;

                newPostMutation.mutate();
              }}
            >
              <textarea
                ref={textareaRef}
                className="w-full h-7 py-0.5 text-white bg-black rounded-lg focus:outline-none text-xl overflow-hidden resize-none"
                onKeyDown={useEnterSubmit({
                  loading,
                  content,
                  onSubmit: () => newPostMutation.mutate(),
                })}
                placeholder="What is happening?!"
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
              {/* Make images container responsive and constrained */}
              {selectedFiles.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2 max-w-full">
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
              {/* Make the bottom toolbar responsive */}
              <div className="w-full h-[48px] py-0.5 mt-1.5">
                <div className="flex flex-row w-full h-full items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileUpload onImagesUploaded={handleImagesUploaded} />
                  </div>
                  <button
                    className={classNames(
                      'flex justify-center items-center text-center rounded-full px-3 h-9 text-base font-bold transition duration-300',
                      {
                        'bg-white text-black hover:bg-gray-300':
                          !loading && content.trim() !== '',
                        'bg-white text-black opacity-70 cursor-not-allowed':
                          loading || content.trim() === '',
                      }
                    )}
                    onClick={() => newPostMutation.mutate()}
                    disabled={loading || content.trim() === ''}
                  >
                    Post
                  </button>
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

export default NewPostPage;
