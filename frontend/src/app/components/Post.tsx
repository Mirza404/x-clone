import React from "react";
import handleDelete from "../allPosts/handleDelete";

interface PostProps {
  id: string;
  content: string;
  author: string;
  createdAt: Date;
}

const Post: React.FC<PostProps> = ({ id, content, author, createdAt }) => {
  const formattedDate = new Date(createdAt).toLocaleString();

  console.log("Post id: ", id);

  return (
    <div className="border border-gray-300 rounded-lg p-4 mb-4 bg-white shadow-md">
      <div className="flex justify-between mb-2">
        <span className="font-bold text-blue-500">{author}</span>
        <span className="text-gray-500">{formattedDate}</span>
      </div>
      <div className="text-gray-900">{content}</div>
      <button
        onClick={() => {
          console.log("Post id you got by  clicking the button: ", id);
          handleDelete(id);
        }}
        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-700"
      >
        Delete
      </button>
    </div>
  );
};

export default Post;
