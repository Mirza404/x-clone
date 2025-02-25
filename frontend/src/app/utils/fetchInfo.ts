import axios from "axios";

export interface Post {
  id: string;
  author: string;
  content: string;
  likes: [string];
  images: [string];
  name: string;
  createdAt: Date;
  authorImage: string;
}

export const fetchPosts = async () => {
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const response = await axios.get(`${serverUrl}/api/post/`);
  return response.data.posts;
};

export async function getPost(id: string) {
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const response = await axios.get(`${serverUrl}/api/post/${id}`);
  console.log(response.data.post);
  return response.data.post;
}

export async function getPostsPaginated(page: number) {
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;

  try {
    const res = await axios.get(`${serverUrl}/api/post/`, {
      params: { page: page, sort: "createdAt", limit: 5 },
    });
    console.log("Response:", res); // Log the entire response
    const totalPages = res.data.totalPages;
    console.log("Total Pages:", totalPages); // Log the total pages
    const hasNext = page < totalPages;
    return {
      nextPage: hasNext ? page + 1 : undefined,
      previousPage: page > 1 ? page - 1 : undefined,
      posts: res.data,
    };
  } catch (error: Error | any) {
    console.error(
      "Error fetching posts:",
      error.response ? error.response.data : error.message
    );
    return {
      nextPage: undefined,
      previousPage: undefined,
      posts: [],
    };
  }
}
