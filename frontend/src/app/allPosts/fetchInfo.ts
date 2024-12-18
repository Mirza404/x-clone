"use client";
export interface Post {
  id: string;
  author: string;
  content: string;
  createdAt: Date;
}

const fetchPosts = async () => {
  const response = await fetch("http://localhost:3001/api/post/allposts");
  const data = await response.json();
  return data.posts;
};

export default fetchPosts;
