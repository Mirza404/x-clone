"use client";
import React, { useEffect, useState } from "react";
import Post from "./Post";
import fetchPosts from "./FetchInfo";

interface Post {
  id: number;
  author: string;
  content: string;
  createdAt: Date;
}

interface PostListProps {
  allPosts: Post[];
}

const PostList: React.FC<PostListProps> = () => {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    fetchPosts().then((fetchPosts) => setPosts(fetchPosts));
  }, []);

  return (
    <div>
      {posts.map((post) => (
        <div key={post.id}>
          <Post
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
