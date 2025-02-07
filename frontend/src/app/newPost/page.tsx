"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession, useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useMutation } from "@tanstack/react-query";
import { fetchPosts } from "../posts/fetchInfo";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import classNames from "classnames";
import CustomToaster from "../components/CustomToaster";
import LoadingBar from "../components/CustomLoadBar";
import FileUpload from "../components/FileUpload";

const NewPostPage = () => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [progress, setProgress] = useState(0);
  const queryClient = useQueryClient();
  const router = useRouter();
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const { data: session } = useSession();


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

    fetchSession();
  }, [router]);

  const postsQuery = useQuery({
    queryKey: ["posts"],
    queryFn: () => fetchPosts(),
  });

  const newPostMutation = useMutation({
    mutationFn: () => {
      setLoading(true);
      return axios.post(
        `${serverUrl}/api/post/new`,
        {
          content,
          email,
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
    },
    onError: (error: Error) => {
      setLoading(false);
      toast.error(`Error creating post: ${error.message}`);
    },
  });

  return (
    <>
      <div className="flex items-top justify-center bg-black bg-opacity-50 backdrop-blur-sm mt-0 max-h-[153px] ">
        <LoadingBar progress={progress} />
        <div className="flex  bg-black border border-gray-500 p-6 shadow-lg w-full max-w-md min-w-[598px] min-h-[200px] m-0">
          <img
            className="flex w-10 h-10 rounded-full mr-4"
            src={session?.user?.image ?? "https://via.placeholder.com/150"}
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
          />
          <textarea
            className="w-full p-3 text-white bg-black rounded-lg focus:outline-none"
            placeholder="What is happening?!"
            // 514x52
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button
            className={classNames(
              "mt-4 w-full py-2 px-4 rounded-lg transition duration-300",
              {
                "bg-white text-black hover:bg-gray-300":
                  !loading && content.trim() !== "",
                "bg-white text-black opacity-70":
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
          <FileUpload />
        </div>
      </div>
      <CustomToaster />
    </>
  );
};

export default NewPostPage;
