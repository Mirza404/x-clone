"use client";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import CustomToaster from "@/app/components/ui/CustomToaster";
import LoadingBar from "@/app/components/ui/CustomLoadBar";
import classNames from "classnames";
import FileUpload from "@/app/utils/FileUpload";

function EditPostPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const router = useRouter();
  const { data: session } = useSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const postsQuery = useQuery({
    queryKey: ["posts", id],
    queryFn: async () => {
      const { data } = await axios.get(`${serverUrl}/api/post/${id}`);
      return data.post;
    },
  });

  useEffect(() => {
    if (postsQuery.data) {
      setContent(postsQuery.data.content);
      setExistingImages(postsQuery.data.images || []);
    }
  }, [postsQuery.data]);

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
        setProgress((completedUploads / totalFiles) * 50);
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
      const response = await axios.patch(`${serverUrl}/api/post/edit`, {
        id,
        content,
        images: allImages,
      });
      setProgress(100);
      return response;
    },
    onSuccess: () => {
      toast.success("Post updated successfully");
      setTimeout(() => {
        router.push("/posts");
      }, 1000);
    },
    onError: (error: any) => {
      setLoading(false);
      setProgress(0);
      toast.error(error.response?.data?.message || "Failed to update the post");
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
            />
          </div>
          <div className="flex flex-col py-3 flex-1">
            <textarea
              ref={textareaRef}
              className="w-full min-h-[28px] py-0.5 text-white bg-black rounded-lg focus:outline-none text-xl resize-none"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${Math.min(target.scrollHeight, 300)}px`;
              }}
            />

            {/* Existing Images */}
            {existingImages.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {existingImages.map((image, index) => (
                  <div key={`existing-${index}`} className="relative group">
                    <img
                      src={image || "/placeholder.svg"}
                      alt="Existing"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeImage(index, true)}
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

            {/* New Images */}
            {selectedFiles.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {selectedFiles.map((file, index) => (
                  <div key={`new-${index}`} className="relative group">
                    <img
                      src={URL.createObjectURL(file) || "/placeholder.svg"}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeImage(index, false)}
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

            <div className="w-full h-[48px] py-0.5 mt-1.5">
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
                  onClick={() => updatePostMutation.mutate()}
                  disabled={loading || content.trim() === ""}
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <CustomToaster />
    </>
  );
}

export default EditPostPage;
