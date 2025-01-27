"use client";
import React, { useState, useEffect } from "react";
import PostComponent from "../components/Post";
import { fetchPosts } from "./fetchInfo";
import { useSession } from "next-auth/react";
import type { Post } from "../components/Post";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";
import NewPostPage from "../newPost/page";
import { Toaster } from "react-hot-toast";
import CustomToaster from "../components/CustomToaster";
import { LoadingBarContainer } from "react-top-loading-bar";
import DropDownMenu from "../components/DropDownMenu";

export interface PostListProps {
  allPosts: Post[];
}

export const Page: React.FC<PostListProps> = () => {
  const [loading, setLoading] = useState(true);
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const { data: session } = useSession();
  // const ref = useRef<LoadingBarRef>(null);

  const toggleDropdown = (id: string) => {
    setDropdownOpen(dropdownOpen === id ? null : id);
  };

  // Assuming this is within a React component

  const postsQuery = useQuery({
    queryKey: ["posts"],
    queryFn: () => fetchPosts(),
  });

  const deletePostMutation = useMutation({
    mutationFn: async (id: string) => {
      setLoading(true);
      try {
        return await axios.delete(`${serverUrl}/api/post/delete`, {
          data: { id },
          headers: {
            "Content-Type": "application/json",
          },
        });
      } catch (error: any) {
        throw new Error(error.message);
      } finally {
        setLoading(false);
      }
    },
    onSuccess: () => {
      toast.success("Post deleted successfully");
      postsQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(`Error deleting post: ${error.message}`);
    },
  });

  if (postsQuery.isLoading)
    return (
      <div className="flex justify-center p-4 min-w-[600px] min-h-[200px]">
        <div className="w-10 h-10 border-4 border-t-blue-500 border-gray-300 rounded-full animate-spin"></div>
      </div>
    );
  if (postsQuery.isError) return <pre>Error</pre>;

  return (
    <div className="flex justify-center flex-col m-0">
      <LoadingBarContainer>
        <NewPostPage />
      </LoadingBarContainer>

      {postsQuery.data?.map((post: Post) => (
        <div
          key={post.id}
          className="relative p-4 border border-gray-500 rounded-none shadow-md bg-black m-0 tweet-content w-[598px] min-h-[200px]"
        >
          <div className="flex items-center mb-2 text-sm text-gray-400">
            <span className="font-bold">{post.name}</span>
            <span className="mx-1">·</span>
            <span>
              {new Date(post.createdAt).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <PostComponent
            id={post.id}
            content={post.content}
            name={post.name}
            author={post.author}
            createdAt={post.createdAt}
          />
          <div className="absolute top-2 right-2 mr-2">
            <button
              className="p-1 rounded-full hover:bg-gray-800 transition delay-100"
              onClick={() => toggleDropdown(post.id)}
            >
              <svg
                fill="#9ca3af"
                height="14px"
                width="14px"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                stroke="#9ca3af"
                strokeWidth="0.848"
              >
                <path d="M8,6.5A1.5,1.5,0,1,1,6.5,8,1.5,1.5,0,0,1,8,6.5ZM.5,8A1.5,1.5,0,1,0,2,6.5,1.5,1.5,0,0,0,.5,8Zm12,0A1.5,1.5,0,1,0,14,6.5,1.5,1.5,0,0,0,12.5,8Z"></path>
              </svg>
            </button>

            {dropdownOpen === post.id &&
              session?.user?.id === post.author &&
              session && (
                <DropDownMenu
                  onDelete={() => deletePostMutation.mutate(post.id)}
                  onEdit={() => router.push(`/posts/${post.id}/editPost`)}
                />
              )}
          </div>
        </div>
      ))}
      <CustomToaster />
    </div>
  );
};

export default Page;
