import axios from 'axios';
import type { Comment } from '../types/Comment';
import { getApiErrorMessage } from './apiError';
import api from './apiClient';

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
      posts: res.data.posts,
    };
  } catch (error: unknown) {
    console.error('Error fetching posts:', getApiErrorMessage(error, 'Error'));
    return {
      nextPage: undefined,
      previousPage: undefined,
      posts: [],
    };
  }
}

// The single fetcher for one comment (plus its replies). There used to be a
// second one, `getCommentById`, hitting the exact same endpoint but read under
// a different cache key, so the prefetch in CommentItem never served the
// thread page and every navigation refetched from scratch. Unwrapped return
// shape, rethrows so React Query can surface an error state.
export async function getComment(
  postId: string,
  commentId: string
): Promise<Comment | null> {
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  try {
    const response = await axios.get(
      `${serverUrl}/api/post/${postId}/comment/${commentId}`
    );
    return (response.data as Comment[])[0] ?? null;
  } catch (error) {
    console.error('Failed to fetch comment:', error);
    throw error;
  }
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
  } catch (error: unknown) {
    console.error(
      'Error fetching comments:',
      getApiErrorMessage(error, 'Error')
    );
    return {
      nextPage: undefined,
      previousPage: undefined,
      comments: [],
    };
  }
}
export async function getSearchResultsPaginated(query: string, page: number) {
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;

  try {
    const res = await axios.get(`${serverUrl}/api/post/search`, {
      params: { q: query, page, limit: 10 },
    });
    const totalPages = res.data.totalPages;
    const hasNext = page < totalPages;
    return {
      nextPage: hasNext ? page + 1 : undefined,
      previousPage: page > 1 ? page - 1 : undefined,
      posts: res.data.posts,
    };
  } catch (error: unknown) {
    console.error('Error searching posts:', getApiErrorMessage(error, 'Error'));
    return {
      nextPage: undefined,
      previousPage: undefined,
      posts: [],
    };
  }
}

export async function getFollowingPostsPaginated(page: number) {
  try {
    const res = await api.get('/api/post/following', {
      params: { page, limit: 5 },
    });
    const totalPages = res.data.totalPages;
    const hasNext = page < totalPages;
    return {
      nextPage: hasNext ? page + 1 : undefined,
      previousPage: page > 1 ? page - 1 : undefined,
      posts: res.data.posts,
    };
  } catch (error: unknown) {
    console.error(
      'Error fetching following posts:',
      getApiErrorMessage(error, 'Error')
    );
    return {
      nextPage: undefined,
      previousPage: undefined,
      posts: [],
    };
  }
}

export async function getPostsByAuthorPaginated(
  authorId: string,
  page: number
) {
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;

  try {
    const res = await axios.get(`${serverUrl}/api/post/`, {
      params: { page, author: authorId, sort: 'createdAt', limit: 5 },
    });
    const totalPages = res.data.totalPages;
    const hasNext = page < totalPages;
    return {
      nextPage: hasNext ? page + 1 : undefined,
      previousPage: page > 1 ? page - 1 : undefined,
      posts: res.data.posts,
    };
  } catch (error: unknown) {
    console.error(
      'Error fetching author posts:',
      getApiErrorMessage(error, 'Error')
    );
    return {
      nextPage: undefined,
      previousPage: undefined,
      posts: [],
    };
  }
}
