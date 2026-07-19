'use client';
import axios from 'axios';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession, useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { useMutation } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { Image as ImageIcon, Smile, Calendar, MapPin, ListOrdered } from 'lucide-react';
import CustomToaster from '../components/ui/CustomToaster';
import LoadingBar from '../components/ui/CustomLoadBar';
import FileUpload from '../utils/FileUpload';
import IconButton from '../components/ui/IconButton';
import Avatar from '../components/ui/Avatar';
import classNames from 'classnames';
import { uploadImages } from '../utils/imageUtils';
import { useEnterSubmit } from '../utils/formSubmit';

const NewPostPage = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const queryClient = useQueryClient();
  const router = useRouter();
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const { data: session } = useSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const session = await getSession();
      if (!session || !session.user) {
        setSignedIn(false);
        setLoading(false);
      } else {
        if (session.user.email) {
          setEmail(session.user.email);
        }
        setSignedIn(true);
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

  const handleTextareaKeyDown = useEnterSubmit({
    loading,
    content,
    onSubmit: () => newPostMutation.mutate(),
  });

  if (signedIn === null) {
    return null;
  }

  if (signedIn === false) {
    return (
      <div className="hidden md:flex items-center justify-between bg-bg w-full px-4 py-4 border-b border-border">
        <span className="text-content">Sign in to post.</span>
        <Link
          href="/api/auth/signin"
          className="flex justify-center items-center rounded-full px-4 h-9 text-[15px] font-bold bg-primary text-white hover:bg-primary-hover transition duration-300"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="hidden md:flex items-center justify-center bg-bg w-full min-h-[116px] border-b border-border">
        <LoadingBar progress={progress} />
        <div className="flex flex-row mt-0 mx-auto px-4 pt-3 pb-2 w-full">
          <div className="mr-3 min-w-[40px] w-[40px] flex-shrink-0">
            <Avatar
              src={session?.user?.image}
              alt="Profile"
              size="md"
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
            />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (loading || content.trim() === '') return;

                newPostMutation.mutate();
              }}
            >
              <textarea
                ref={textareaRef}
                className="w-full h-7 py-0.5 text-content bg-transparent rounded-lg focus:outline-none text-xl placeholder-muted overflow-hidden resize-none"
                onKeyDown={handleTextareaKeyDown}
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
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/75 text-white/70 hover:text-white transition-colors"
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
                  <div className="flex items-center gap-1">
                    <FileUpload onImagesUploaded={handleImagesUploaded} />
                    <IconButton icon={ImageIcon} accent="blue" aria-label="Add GIF" disabled />
                    <IconButton icon={ListOrdered} accent="blue" aria-label="Add poll" disabled />
                    <IconButton icon={Smile} accent="blue" aria-label="Add emoji" disabled />
                    <IconButton icon={Calendar} accent="blue" aria-label="Schedule post" disabled />
                    <IconButton icon={MapPin} accent="blue" aria-label="Add location" disabled />
                  </div>
                  <button
                    className={classNames(
                      'flex justify-center items-center text-center rounded-full px-4 h-9 text-[15px] font-bold transition duration-300',
                      {
                        'bg-primary text-white hover:bg-primary-hover':
                          !loading && content.trim() !== '',
                        'bg-primary text-white opacity-50 cursor-not-allowed':
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
