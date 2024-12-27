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
  const formattedDate = new Date(createdAt).toLocaleString();
  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="font-bold text-blue-500">{name}</span>
        <span className="text-gray-500">{formattedDate}</span>
      </div>
      <div className="text-gray-900">{content}</div>
      <Toaster />
    </div>
  );
};

export default Post;
