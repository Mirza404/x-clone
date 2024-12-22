"use client";
import axios from "axios";
export interface Post {
  id: string;
  author: string;
  content: string;
  createdAt: Date;
}

const fetchPosts = async () => {
  const response = await axios.get("http://localhost:3001/api/post/allposts");
  return response.data.posts;
};

export default fetchPosts;
