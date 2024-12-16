import React from "react";

interface PostProps {
  content: string;
  author: string;
  createdAt: Date;
}

const Post: React.FC<PostProps> = ({ content, author, createdAt }) => {
  const formattedDate = new Date(createdAt).toLocaleString();

  return (
    <div className="border border-gray-300 rounded-lg p-4 mb-4 bg-white shadow-md">
      <div className="flex justify-between mb-2">
        <span className="font-bold text-blue-500">{author}</span>
        <span className="text-gray-500">{formattedDate}</span>
      </div>
      <div className="text-gray-900">{content}</div>
    </div>
  );
};

export default Post;
