"use client";
import { getPost } from "../../utils/fetchInfo";
import React, { useState, useEffect } from "react";
import PostComponent from "../../components/posts/PostItem";
import axios from "axios";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function Page({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const id = params.id;
  const router = useRouter();

  const postsQuery = useQuery({
    queryKey: ["posts", id],
    queryFn: async () => await getPost(id),
  });

  useEffect(() => {
    if (postsQuery.isError) {
      router.push("/posts");
    }
  }, [router]);

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
        router.push("/posts");
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
      <div className="p-4 border border-gray-500 rounded-none shadow-md bg-black m-0 tweet-content">
        {postsQuery.data && (
          <>
            <PostComponent
              id={postsQuery.data._id}
              content={postsQuery.data.content}
              name={postsQuery.data.name}
              author={postsQuery.data.author}
              createdAt={postsQuery.data.createdAt}
            />
            <button
              onClick={() => {
                if (postsQuery.data?._id) {
                  deletePostMutation.mutate(postsQuery.data._id);
                } else {
                  console.error("Post ID is undefined");
                }
              }}
              className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Delete
            </button>
            <button
              onClick={() =>
                router.push(`/posts/${postsQuery.data._id}/editPost`)
              }
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Edit
            </button>
          </>
        )}
      </div>
    </div>
  );
}
