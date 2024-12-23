"use client";
import axios from "axios";

export interface Post {
  id: string;
  author: string;
  content: string;
  createdAt: Date;
}

const fetchPosts = async () => {
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const response = await axios.get(`${serverUrl}/api/post/allposts`);
  return response.data.posts;
};

export default fetchPosts;
