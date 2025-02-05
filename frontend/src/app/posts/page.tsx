"use client";
import React from "react";
import { fetchPosts } from "./fetchInfo";
import type { Post } from "./fetchInfo";
import { useQuery } from "@tanstack/react-query";
import NewPostPage from "../newPost/page";
import PostListInfinite from "../components/PostListInfinite";
import CustomToaster from "../components/CustomToaster";
import LoadCircle from "../components/LoadCircle";

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
      <LoadCircle />
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
