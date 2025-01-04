"use client";
import React, { useState } from "react";
import PostComponent from "../components/Post";
import { fetchPosts, getPost } from "./fetchInfo";
import type { Post } from "../components/Post";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation"; // Correct import for useRouter in Next.js 13+
import PostPage from "./[id]/page";
import { PostListInfinite } from "../components/PostListInfinite";

interface PostListProps {
  allPosts: Post[];
}

export const PostList: React.FC<PostListProps> = () => {
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const router = useRouter(); // Correct useRouter hook

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

  

  if (postsQuery.isLoading) return <div>Loading..</div>;
  if (postsQuery.isError) return <pre>Error</pre>;

  return (
    <div>
      {postsQuery.data?.map((post: Post) => (
        <div key={post.id} className="p-4 border rounded-lg shadow-md bg-white">
          <Link href={`/posts/${post.id}`}>
            <PostComponent
              id={post.id}
              content={post.content}
              name={post.name}
              author={post.author}
              createdAt={post.createdAt}
            />
          </Link>
          <button
            onClick={() => deletePostMutation.mutate(post.id)}
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Delete
          </button>
          <button
            onClick={() => router.push(`/posts/${post.id}/editPost`)}
            
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Edit
          </button>
        </div>
      ))}
      {/* <PostListInfinite /> */}
    </div>
  );
};

export default PostList;
