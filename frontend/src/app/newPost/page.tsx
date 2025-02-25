"use client";
import axios from "axios";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSession, useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import CustomToaster from "../components/ui/CustomToaster";
import LoadingBar from "../components/ui/CustomLoadBar";
import FileUpload from "../utils/FileUpload";
import classNames from "classnames";

const NewPostPage = () => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const queryClient = useQueryClient();
  const router = useRouter();
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const { data: session } = useSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const session = await getSession();
      if (!session || !session.user) {
        router.push("/api/auth/signin");
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
      textareaRef.current.style.height = "28px";
    }
  };

  const uploadImages = async (files: File[]) => {
    if (files.length === 0) return [];

    const uploadedUrls: string[] = [];
    const totalFiles = files.length;
    let completedUploads = 0;

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "x_clone");

      try {
        const response = await axios.post(
          `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`,
          formData
        );
        uploadedUrls.push(response.data.secure_url);
        completedUploads++;
        setProgress((completedUploads / totalFiles) * 50); // Use first 50% for uploads
      } catch (error) {
        console.error("Upload failed:", error);
        toast.error("Image upload failed. Please try again.");
        throw error;
      }
    }

    return uploadedUrls;
  };

  const handleImagesUploaded = (files: File[]) => {
    setSelectedFiles(files);
  };

  const removeImage = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
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
            "Content-Type": "application/json",
          },
        }
      );
      setProgress(100);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["Iposts"] });
      toast.success("Your post was sent.");
      setLoading(false);
      router.push("/posts");
      setContent("");
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
      <div className="flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm min-h-[116px]">
        <LoadingBar progress={progress} />
        <div className="flex flex-row bg-black bg-opacity-50 backdrop-blur-sm mt-0 w-[598px] mx-auto px-4 pt-2 border border-gray-700 shadow-lg">
          <div className="pt-2 mr-2">
            <img
              className="flex w-10 h-10 rounded-full"
              src={session?.user?.image ?? "https://via.placeholder.com/150"}
              referrerPolicy="no-referrer"
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
            />
          </div>
          <div className="flex flex-col py-3">
            <textarea
              ref={textareaRef}
              className="flex min-w-[513px] h-7 py-0.5 text-white justify-center bg-black rounded-lg focus:outline-none text-xl overflow-hidden resize-none"
              placeholder="What is happening?!"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                const value = target.value;
                const minHeight = 28;
                const maxHeight = 300;

                if (value === "") {
                  target.style.height = `${minHeight}px`;
                } else {
                  target.style.height = `${minHeight}px`;
                  target.style.height = `${Math.min(
                    target.scrollHeight,
                    maxHeight
                  )}px`;
                }
              }}
            />
            {selectedFiles.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file) || "/placeholder.svg"}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
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
            <div className="w-[518px] h-[48px] py-0.5 mt-1.5">
              <div className="flex flex-row w-full h-full items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileUpload onImagesUploaded={handleImagesUploaded} />
                </div>
                <button
                  className={classNames(
                    "flex justify-center items-center text-center rounded-full px-3 h-9 text-base font-bold transition duration-300",
                    {
                      "bg-white text-black hover:bg-gray-300":
                        !loading && content.trim() !== "",
                      "bg-white text-black opacity-70 cursor-not-allowed":
                        loading || content.trim() === "",
                    }
                  )}
                  onClick={() => newPostMutation.mutate()}
                  disabled={loading || content.trim() === ""}
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <CustomToaster />
    </>
  );
};

export default NewPostPage;
