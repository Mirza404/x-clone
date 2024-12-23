import React from "react";
import { Toaster } from "react-hot-toast";
export interface Post {
  id: string;
  content: string;
  author: string;
  createdAt: Date;
}

const Post: React.FC<Post> = ({ id, content, author, createdAt }) => {
  const formattedDate = new Date(createdAt).toLocaleString();
  return (
    <div className="p-4 mb-4 bg-white ">
      <div className="flex justify-between mb-2">
        <span className="font-bold text-blue-500">{author}</span>
        <span className="text-gray-500">{formattedDate}</span>
      </div>
      <div className="text-gray-900">{content}</div>
      <Toaster />
    </div>
  );
};

export default Post;
