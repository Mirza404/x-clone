import axios from 'axios';

export const fetchPosts = async () => {
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const response = await axios.get(`${serverUrl}/api/post/`);
  return response.data.posts;
};

export async function getPost(id: string) {
  try {
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
    const response = await axios.get(`${serverUrl}/api/post/${id}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch post:', error);
    return null;
  }
}

export async function getPostsPaginated(page: number) {
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;

  try {
    const res = await axios.get(`${serverUrl}/api/post/`, {
      params: { page: page, sort: 'createdAt', limit: 5 },
    });
    const totalPages = res.data.totalPages;
    const hasNext = page < totalPages;
    return {
      nextPage: hasNext ? page + 1 : undefined,
      previousPage: page > 1 ? page - 1 : undefined,
      posts: res.data,
    };
  } catch (error: Error | any) {
    console.error(
      'Error fetching posts:',
      error.response ? error.response.data : error.message
    );
    return {
      nextPage: undefined,
      previousPage: undefined,
      posts: [],
    };
  }
}

export async function getComment(postId: string, commentId: string) {
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const response = await axios.get(
    `${serverUrl}/api/post/${postId}/comment/${commentId}`
  );
  return response.data.comment;
}

export async function getCommentsPaginated(postId: string, page: number) {
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;

  try {
    const res = await axios.get(`${serverUrl}/api/post/${postId}/comment`, {
      params: { page: page, limit: 5 },
    });
    const totalPages = res.data.totalPages;
    const hasNext = page < totalPages;

    return {
      nextPage: hasNext ? page + 1 : undefined,
      previousPage: page > 1 ? page - 1 : undefined,
      comments: res.data.comments,
    };
  } catch (error: Error | any) {
    console.error(
      'Error fetching comments:',
      error.response ? error.response.data : error.message
    );
    return {
      nextPage: undefined,
      previousPage: undefined,
      comments: [],
    };
  }
}
export async function getCommentById(
  postId: string,
  commentId: string
): Promise<any> {
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  try {
    const response = await axios.get(
      `${serverUrl}/api/post/${postId}/comment/${commentId}`
    );
    return response.data;
  } catch (error) {
    console.error('Failed to fetch comment:', error);
    throw error;
  }
}
