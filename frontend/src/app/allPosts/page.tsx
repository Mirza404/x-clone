"use client";
import React from "react";
import { useEffect, useState } from "react";
import Post from "./Post";

interface Post {
  id: number;
  title: string;
  content: string;
}

interface PostListProps {
  allPosts: Post[];
}

const PostList: React.FC<PostListProps> = ({ allPosts }) => {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    const fetchPosts = async () => {
      const response = await fetch("/api/posts", {
        method: "GET",
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts);
      } else {
        console.error("Failed to fetch posts");
      }
    };

    fetchPosts();
  }, []);

  return (
    <div>
      {posts.map((post) => (
        <div key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.content}</p>
        </div>
      ))}
    </div>
  );
};

export default PostList;
