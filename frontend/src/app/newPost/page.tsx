"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useMutation } from "@tanstack/react-query";
import { fetchPosts } from "../posts/fetchInfo";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import classNames from "classnames";
import { Toaster } from "react-hot-toast";
import { useLoadingBar } from "react-top-loading-bar";

const NewPostPage = () => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [progress, setProgress] = useState(0);
  const queryClient = useQueryClient();
  const router = useRouter();
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const { start, complete } = useLoadingBar({
    color: "#3b82f6",
    height: 2,
  });

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
      complete();
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setLoading(false);
      toast.success("Post created successfully");
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
      <div className="flex items-top justify-center bg-black bg-opacity-50 backdrop-blur-sm mt-0 h-[223px] ">
        
        <div className="bg-black border border-gray-500 p-6 shadow-lg w-full max-w-md min-w-[598px] min-h-[200px] m-0">
          <textarea
            className="w-full p-3 border border-gray-300 text-white bg-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="What is happening?!"
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
              start();
              newPostMutation.mutate();
            }}
            disabled={loading || content.trim() === ""}
          >
            Post
          </button>
        </div>
      </div>
      <Toaster position="top-right" />
    </>
  );
};

export default NewPostPage;
