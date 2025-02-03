"use client";
import React from "react";
import { useState } from "react";

interface Post {
  id: string;
  content: string;
  name: string;
  author: string;
  createdAt: Date;
  authorName: string;
  authorImage: string;
}

const Post: React.FC<Post> = ({ id, content, name, author, createdAt }) => {
  const [showMore, setShowMore] = useState(false);

  const toggleShowMore = () => setShowMore(!showMore);

  

  return (
    <div className="bg-black p-4 hover:bg-gray-800">
      
      <div className="text-white">
        {showMore ? content : `${content.substring(0, 300)}`}
        {content.length > 300 && (
          <button onClick={toggleShowMore} className="text-blue-500">
            {showMore ? "Show less" : "Read more"}
          </button>
        )}
      </div>
    </div>
  );
};

export default Post;
