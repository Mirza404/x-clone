import React from "react";
import toast, { Toaster } from "react-hot-toast";
import { useState } from "react";
import handleDelete from "../allPosts/handleDelete";
// import useDeletePost from "../hooks/useDeletePost";

interface PostProps {
  id: string;
  content: string;
  author: string;
  createdAt: Date;
}

const Post: React.FC<PostProps> = ({ id, content, author, createdAt }) => {
  const formattedDate = new Date(createdAt).toLocaleString();
  const [loading, setLoading] = useState(true);
  return (
    <div className="border border-gray-300 rounded-lg p-4 mb-4 bg-white shadow-md">
      <div className="flex justify-between mb-2">
        <span className="font-bold text-blue-500">{author}</span>
        <span className="text-gray-500">{formattedDate}</span>
      </div>
      <div className="text-gray-900">{content}</div>
      <button
        onClick={() => {}}
        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-700"
      >
        Delete
      </button>
      <Toaster />
    </div>
  );
};

export default Post;
