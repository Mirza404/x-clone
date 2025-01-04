"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";

function EditPostPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const [loading, setLoading] = useState(false);

  const postsQuery = useQuery({
    queryKey: ["posts", id],
    queryFn: async () => await getPost(id),
  });

  const [content, setContent] = useState("");

  useEffect(() => {
    if (postsQuery.data) {
      setContent(postsQuery.data.content);
    }
  }, [postsQuery.data]);

  const getPost = async (id: string) => {
    try {
      const { data } = await axios.get(`${serverUrl}/api/post/${id}`);
      return data.post;
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to fetch post details"
      );
      throw error;
    }
  };

  const updatePost = async ({
    id,
    content,
  }: {
    id: string;
    content: string;
  }) => {
    try {
      setLoading(true);
      await axios.patch(`${serverUrl}/api/post/edit`, { id, content });
      toast.success("Post updated successfully");
      window.location.href = `/posts/${id}`;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update the post");
    } finally {
      setLoading(false);
    }
  };
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  return (
    <>
      <div className="p-4 border rounded-lg shadow-md bg-white">
        {postsQuery.data && (
          <>
            <div className="flex justify-between mb-2">
              <span className="font-bold text-blue-500">
                {postsQuery.data.name}
              </span>
              <span className="text-gray-500">
                {new Date(postsQuery.data.createdAt).toLocaleString()}
              </span>
            </div>
            <textarea
              className="text-black border rounded-2xl m-2 p-2 w-full"
              defaultValue={postsQuery.data.content}
              onChange={handleContentChange}
            />
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => {
                if (content.trim() === "") {
                  toast.error("Content cannot be empty");
                  return;
                }
                updatePost({ id: postsQuery.data._id, content });
              }}
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Post"}
            </button>
          </>
        )}
      </div>
    </>
  );
}

export default EditPostPage;
