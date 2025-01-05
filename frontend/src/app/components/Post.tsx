"use client";
import React from "react";
import { Toaster } from "react-hot-toast";
import { useState } from "react";

export interface Post {
  id: string;
  content: string;
  name: string;
  author: string;
  createdAt: Date;
}

const Post: React.FC<Post> = ({ id, content, name, author, createdAt }) => {
  const [showMore, setShowMore] = useState(false);

  const toggleShowMore = () => setShowMore(!showMore);

  

  return (
    <div className="bg-black p-4">
      
      <div className="text-white">
        {showMore ? content : `${content.substring(0, 300)}`}
        {content.length > 300 && (
          <button onClick={toggleShowMore} className="text-blue-500">
            {showMore ? "Show less" : "Read more"}
          </button>
        )}
      </div>
      <Toaster />
    </div>
  );
};

export default Post;
