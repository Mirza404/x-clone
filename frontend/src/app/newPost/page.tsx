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
  const [images, setImages] = useState<string[]>([]);
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
        router.push("/api/auth/signin");
      } else {
        if (session.user.email) {
          setEmail(session.user.email);
          console.log("email found: ", session.user.email);
        } else {
          console.log("no email found");
        }
        setLoading(false);
      }
    };

    const handleImageUpload = (event: Event) => {
      const customEvent = event as CustomEvent<string[]>;
      console.log("Received images from FileUpload:", customEvent.detail);
      setImages(customEvent.detail);
    };

    fetchSession(); // Ensure session logic runs

    window.addEventListener("imagesUploaded", handleImageUpload);

    return () => {
      window.removeEventListener("imagesUploaded", handleImageUpload);
    };
  }, [router]); // Single dependency array

  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "28px"; // Reset to min height
    }
  };

  const newPostMutation = useMutation({
    mutationFn: () => {
      setLoading(true);
      return axios.post(
        `${serverUrl}/api/post/new`,
        {
          content,
          email,
          images,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    },
    onSuccess: () => {
      setProgress(100);
      queryClient.invalidateQueries({ queryKey: ["Iposts"] });
      toast.success("Your post was sent.");
      setLoading(false);
      router.push("/posts");
      setContent("");
      setImages([]);
      resetTextareaHeight(); // Add this line
    },
    onError: (error: Error) => {
      setLoading(false);
      toast.error(`Error creating post: ${error.message}`);
    },
  });

  return (
    <>
      <div className="flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm min-h-[116px]">
        <LoadingBar progress={progress} />
        <div className="flex flex-row bg-black bg-opacity-50 backdrop-blur-sm  mt-0 w-[598px] mx-auto px-4 pt-2 border border-gray-700 shadow-lg">
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
            <div className="w-[518px] h-[48px] py-0.5 mt-1.5">
              <div className="flex flex-row w-full h-full items-center justify-between">
                {/* Buttons, justified left */}
                <div className="flex items-center space-x-2">
                  <FileUpload />
                </div>
                {/* Post button, justified right */}
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
                  onClick={() => {
                    setProgress(0);
                    newPostMutation.mutate();
                  }}
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
