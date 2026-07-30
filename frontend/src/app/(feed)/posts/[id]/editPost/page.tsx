'use client';
import { use, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import LoadingBar from '@/app/components/ui/CustomLoadBar';
import { uploadImages } from '@/app/utils/imageUtils';
import FileUpload from '@/app/utils/FileUpload';
import { useEnterSubmit } from '@/app/utils/formSubmit';
import { getApiErrorMessage } from '@/app/utils/apiError';
import api from '@/app/utils/apiClient';
import Avatar from '@/app/components/ui/Avatar';
import Button from '@/app/components/ui/Button';

const EditPostPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const router = useRouter();
  const { data: session } = useSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const postsQuery = useQuery({
    queryKey: ['posts', id],
    queryFn: async () => {
      const { data } = await axios.get(`${serverUrl}/api/post/${id}`);
      return data.post;
    },
  });
  const [prevPostData, setPrevPostData] = useState(postsQuery.data);

  if (postsQuery.data !== prevPostData) {
    setPrevPostData(postsQuery.data);
    if (postsQuery.data) {
      setContent(postsQuery.data.content);
      setExistingImages(postsQuery.data.images || []);
    }
  }

  const handleImagesUploaded = (files: File[]) => {
    setSelectedFiles(files);
  };

  const removeImage = (index: number, isExisting: boolean) => {
    if (isExisting) {
      setExistingImages((images) => images.filter((_, i) => i !== index));
    } else {
      setSelectedFiles((files) => files.filter((_, i) => i !== index));
    }
  };

  const updatePostMutation = useMutation({
    mutationFn: async () => {
      setLoading(true);
      setProgress(0);
      // Upload new images
      const uploadedUrls = await uploadImages(selectedFiles);
      // Combine with existing images
      const allImages = [...existingImages, ...uploadedUrls];
      setProgress(50);
      const response = await api.patch('/api/post/edit', {
        id,
        content,
        images: allImages,
      });
      setProgress(100);
      return response;
    },
    onSuccess: () => {
      toast.success('Post updated successfully');
      setTimeout(() => {
        router.replace('/posts');
      }, 1000);
    },
    onError: (error: unknown) => {
      setLoading(false);
      setProgress(0);
      toast.error(getApiErrorMessage(error, 'Failed to update the post'));
    },
  });

  const handleCancel = () => {
    router.back();
  };

  return (
    <>
      <div className="flex min-h-[116px] items-center justify-center">
        <LoadingBar progress={progress} />
        <div className="mx-auto mt-0 flex w-full flex-row border-b border-border px-4 pt-2">
          <div className="mr-2 pt-2">
            <Avatar
              src={session?.user?.image}
              alt={session?.user?.name ?? 'Profile'}
              size="md"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col py-3">
            <div className="mx-2 mb-2">
              <span className="text-sm text-muted">Editing post</span>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (loading || content.trim() === '') return;

                updatePostMutation.mutate();
                setContent('');
              }}
            >
              <textarea
                ref={textareaRef}
                className="mx-2 min-h-[28px] w-full resize-none rounded-lg bg-transparent py-0.5 text-xl text-content placeholder-muted focus:outline-none"
                onKeyDown={useEnterSubmit({
                  loading,
                  content,
                  onSubmit: () => updatePostMutation.mutate(),
                })}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(target.scrollHeight, 300)}px`;
                }}
              />
              {/* Existing Images */}
              {existingImages.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {existingImages.map((image, index) => (
                    <div key={`existing-${index}`} className="relative group">
                      <img
                        src={image || '/placeholder.svg'}
                        alt="Existing"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage(index, true)}
                        className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white transition-colors hover:bg-black/90"
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
              {/* New Images */}
              {selectedFiles.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {selectedFiles.map((file, index) => (
                    <div key={`new-${index}`} className="relative group">
                      <img
                        src={URL.createObjectURL(file) || '/placeholder.svg'}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage(index, false)}
                        className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white transition-colors hover:bg-black/90"
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
              <FileUpload onImagesUploaded={handleImagesUploaded} />
              <div className="ml-2 mt-4 flex justify-between border-t border-border pt-2">
                <span
                  className={`pt-2 text-sm ${content.length > 380 ? 'text-like' : 'text-muted'}`}
                >
                  {content.length}/380 characters
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary-outline"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary-black"
                    onClick={() => updatePostMutation.mutate()}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditPostPage;
