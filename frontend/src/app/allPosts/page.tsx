"use client";
import React, { useState } from "react";
import PostComponent from "../components/Post";
import fetchPosts from "./fetchInfo";
import type { Post } from "../components/Post";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import axios from "axios";

interface PostListProps {
  allPosts: Post[];
}

export const PostList: React.FC<PostListProps> = () => {
  const [loading, setLoading] = useState(true);

  const postsQuery = useQuery({
    queryKey: ["posts"],
    queryFn: () => fetchPosts(),
  });

  const deletePostMutation = useMutation({
    mutationFn: async (id: string) => {
      setLoading(true);
      try {
        return await axios.delete(`http://localhost:3001/api/post/delete`, {
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

  if (postsQuery.isLoading) return <div>Loading..</div>;
  if (postsQuery.isError) return <pre>Error</pre>;

  return (
    <div>
      {postsQuery.data?.map((post: Post) => (
        <div key={post.id} className="p-4 border rounded-lg shadow-md bg-white">
          <PostComponent
            id={post.id}
            content={post.content}
            author={post.author}
            createdAt={post.createdAt}
          />
          <button
            onClick={() => deletePostMutation.mutate(post.id)}
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
};

export default PostList;
