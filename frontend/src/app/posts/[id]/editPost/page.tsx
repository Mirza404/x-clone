"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import CustomToaster from "@/app/components/ui/CustomToaster";
import classNames from "classnames";

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

      setTimeout(() => {
        window.location.href = `/posts`;
      }, 1000);
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
      <div className="p-4 border border-gray-500 shadow-md bg-black h-[223px] min-w-[600px] overflow-y-visible">
        {postsQuery.data && (
          <>
            <div className="flex items-center mb-2 text-sm text-gray-400">
              <span className="font-bold">{postsQuery.data.name}</span>
              <span className="mx-1">·</span>
              <span>
                {new Date(postsQuery.data.createdAt).toLocaleDateString(
                  undefined,
                  {
                    month: "long",
                    day: "numeric",
                  }
                )}
              </span>
            </div>
            <textarea
              className="w-full p-3 border border-gray-300 text-white bg-black rounded-lg "
              defaultValue={postsQuery.data.content}
              onChange={handleContentChange}
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
                if (content.trim() === "") {
                  toast.error("Content cannot be empty");
                  return;
                }
                updatePost({ id: postsQuery.data._id, content });
              }}
              disabled={loading}
            >
              Post
            </button>
          </>
        )}
        <CustomToaster />
      </div>
    </>
  );
}

export default EditPostPage;
