"use client";
import React, { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

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
    const { data } = await axios.get(`${serverUrl}/api/post/${id}`);
    return data.post;
  };
  const updatePost = async ({
    id,
    content,
  }: {
    id: string;
    content: string;
  }) => {
    await axios.patch(`${serverUrl}/api/post/edit`, { id, content });
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
              <textarea
                className="text-black border rounded-2xl m-2 p-2 w-full"
                defaultValue={postsQuery.data.content}
                onChange={handleContentChange}
              />
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                onClick={() => {
                  updatePost({ id: postsQuery.data._id, content });
                  window.location.href = `/posts/${postsQuery.data._id}`;
                  toast.success("Post updated successfully");
                }}
              >
                Update Post
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default EditPostPage;
