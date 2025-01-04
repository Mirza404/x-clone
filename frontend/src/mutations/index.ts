import type { Post } from "@/app/posts/fetchInfo";
import axios from "axios";

export default async function updatePost(updatedPost: Post) {
  const response = await axios.patch(
    `http://localhost:3000/posts/${updatedPost.id}`,
    updatedPost,
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
}
