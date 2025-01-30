import { PageProps } from ".next/types/app/layout";
import axios from "axios";

export interface Post {
  id: string;
  author: string;
  content: string;
  createdAt: Date;
}

export const fetchPosts = async () => {
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const response = await axios.get(`${serverUrl}/api/post/`);
  return response.data.posts;
};

const fetchPostsLength = async () => {
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const response = await axios.get(`${serverUrl}/api/post/`);
  const posts = response.data.posts;
  return posts.length;
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
    console.log('Response:', res); // Log the entire response
    const totalPages = res.data.totalPages;
    console.log('Total Pages:', totalPages); // Log the total pages
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

// http://localhost:3001/api/post/?page=2&sort=createdAt&limit=10

// const items = Array.from({ length: 100 }).map((_, i) => ({
//     id: i,
//     name: `Item ${i}`,
//   }));

//   type Item = (typeof items)[0];

//   const LIMIT = 10;

//   export function fetchItems({ pageParam }: { pageParam: number }): Promise<{
//     data: Item[];
//     currentPage: number;
//     nextPage: number | null;
//   }> {
//     return new Promise((resolve) => {
//       setTimeout(() => {
//         resolve({
//           data: items.slice(pageParam, pageParam + LIMIT),
//           currentPage: pageParam,
//           nextPage: pageParam + LIMIT < items.length ? pageParam + LIMIT : null,
//         });
//       }, 1000);
//     });
//   }
