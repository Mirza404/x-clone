import React from "react";
import { Toaster } from "react-hot-toast";

export interface Post {
  id: string;
  content: string;
  name: string;
  author: string;
  createdAt: Date;
}

const Post: React.FC<Post> = ({ id, content, name, author, createdAt }) => {
  const formattedDate = new Date(createdAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });

  return (
    <div className="bg-black p-4">
      <div className="flex items-center mb-2 text-sm text-gray-400">
        <span className="font-bold">{name}</span>
        <span className="mx-1">·</span>
        <span>{formattedDate}</span>
      </div>
      <div className="text-white">{content}</div>
      <Toaster />
    </div>
  );
};

export default Post;
