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

export async function getPost(id: string) {
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const response = await axios.get(`${serverUrl}/api/post/${id}`);
  console.log(response.data.post);
  return response.data.post;
}

export function getPostsPaginated(page: any) {
  // update ts
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  return axios
    .get(`${serverUrl}/api/post/`, {
      params: { _page: page, _sort: "title", _limit: 2 },
    })
    .then((res) => {
      const hasNext = page * 2 <= parseInt(res.headers["x-total-count"]);
      return {
        nextPage: hasNext ? page + 1 : undefined,
        previousPage: page > 1 ? page - 1 : undefined,
        posts: res.data,
      };
    });
}
