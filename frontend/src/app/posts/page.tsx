"use client";
import React, { useState } from "react";
import PostComponent from "../components/Post";
import { fetchPosts, getPost } from "./fetchInfo";
import type { Post } from "../components/Post";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Page from "../newPost/page";

interface PostListProps {
  allPosts: Post[];
}

export const PostList: React.FC<PostListProps> = () => {
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [modal, setModal] = useState(false);
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  const toggleDropdown = (id: string) => {
    setDropdownOpen(dropdownOpen === id ? null : id);
  };

  const formattedDate = null;

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
        <div
          key={post.id}
          className="relative p-4 border border-gray-500 rounded-none shadow-md bg-black m-0 tweet-content min-w-[600px] min-h-[200px]"
        >
          <div className="flex items-center mb-2 text-sm text-gray-400">
            <span className="font-bold">{post.name}</span>
            <span className="mx-1">·</span>
            <span>
              {" "}
              {post.createdAt.toLocaleString()}
              {""}
            </span>
          </div>
          <Link href={`/posts/${post.id}`}>
            <PostComponent
              id={post.id}
              content={post.content}
              name={post.name}
              author={post.author}
              createdAt={post.createdAt}
            />
          </Link>
          <div className="absolute top-2 right-2 m-2">
            <button onClick={() => toggleDropdown(post.id)}>
              <svg
                fill="#e1d1d1"
                height="24px"
                width="24px"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                stroke="#e1d1d1"
                strokeWidth="0.848"
              >
                <path d="M8,6.5A1.5,1.5,0,1,1,6.5,8,1.5,1.5,0,0,1,8,6.5ZM.5,8A1.5,1.5,0,1,0,2,6.5,1.5,1.5,0,0,0,.5,8Zm12,0A1.5,1.5,0,1,0,14,6.5,1.5,1.5,0,0,0,12.5,8Z"></path>
              </svg>
            </button>

            {dropdownOpen === post.id && (
              <div className="absolute right-0 mt-2 w-48 bg-black border rounded shadow-lg">
                <button
                  onClick={() => deletePostMutation.mutate(post.id)}
                  className="flex items-center w-full px-4 py-2 text-left text-white hover:bg-gray-800"
                >
                  <span className="mr-2">
                    <svg
                      className="w-6 h-6 text-gray-800 dark:text-white"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M8.586 2.586A2 2 0 0 1 10 2h4a2 2 0 0 1 2 2v2h3a1 1 0 1 1 0 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a1 1 0 0 1 0-2h3V4a2 2 0 0 1 .586-1.414ZM10 6h4V4h-4v2Zm1 4a1 1 0 1 0-2 0v8a1 1 0 1 0 2 0v-8Zm4 0a1 1 0 1 0-2 0v8a1 1 0 1 0 2 0v-8Z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </span>
                  Delete
                </button>
                <button
                  onClick={() => router.push(`/posts/${post.id}/editPost`)}
                  className="flex items-center w-full px-4 py-2 text-left text-white hover:bg-gray-800"
                >
                  <span className="mr-2">
                    <svg
                      className="w-6 h-6 text-gray-800 dark:text-white"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M11.32 6.176H5c-1.105 0-2 .949-2 2.118v10.588C3 20.052 3.895 21 5 21h11c1.105 0 2-.948 2-2.118v-7.75l-3.914 4.144A2.46 2.46 0 0 1 12.81 16l-2.681.568c-1.75.37-3.292-1.263-2.942-3.115l.536-2.839c.097-.512.335-.983.684-1.352l2.914-3.086Z"
                        clip-rule="evenodd"
                      />
                      <path
                        fill-rule="evenodd"
                        d="M19.846 4.318a2.148 2.148 0 0 0-.437-.692 2.014 2.014 0 0 0-.654-.463 1.92 1.92 0 0 0-1.544 0 2.014 2.014 0 0 0-.654.463l-.546.578 2.852 3.02.546-.579a2.14 2.14 0 0 0 .437-.692 2.244 2.244 0 0 0 0-1.635ZM17.45 8.721 14.597 5.7 9.82 10.76a.54.54 0 0 0-.137.27l-.536 2.84c-.07.37.239.696.588.622l2.682-.567a.492.492 0 0 0 .255-.145l4.778-5.06Z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </span>
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PostList;
