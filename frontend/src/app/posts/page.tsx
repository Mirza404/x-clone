"use client";
import React from "react";
import { fetchPosts } from "./fetchInfo";
import type { Post } from "../components/Post";
import { useQuery } from "@tanstack/react-query";
import NewPostPage from "../newPost/page";
import PostListInfinite from "../components/PostListInfinite";
import CustomToaster from "../components/CustomToaster";

export interface PostListProps {
  allPosts: Post[];
}

export const Page: React.FC<PostListProps> = () => {
  const postsQuery = useQuery({
    queryKey: ["posts"],
    queryFn: () => fetchPosts(),
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
      <NewPostPage />
      <PostListInfinite />
      <CustomToaster />
    </div>
  );
};

export default Page;
