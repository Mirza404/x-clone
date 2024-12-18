"use client";
import React, { useEffect, useState } from "react";
import PostComponent from "../components/Post";
import fetchPosts from "./fetchInfo";
import type { Post } from "./fetchInfo";

interface PostListProps {
  allPosts: Post[];
}

export const PostList: React.FC<PostListProps> = () => {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const fetchedPosts = await fetchPosts();
      setPosts(fetchedPosts);
    };

    fetchData();
  }, []);
  return (
    <div>
      {posts.map((post) => (
        <div>
          <PostComponent
            key={post.id}
            id={post.id} // Pass the id
            content={post.content}
            author={post.author}
            createdAt={post.createdAt}
          />
        </div>
      ))}
    </div>
  );
};

export default PostList;
