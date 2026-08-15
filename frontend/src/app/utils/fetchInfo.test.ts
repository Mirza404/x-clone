import axios from 'axios';
import api from './apiClient';
import {
  fetchPosts,
  getPost,
  getPostsPaginated,
  getComment,
  getCommentsPaginated,
  getSearchResultsPaginated,
  getFollowingPostsPaginated,
  getPostsByAuthorPaginated,
} from './fetchInfo';

jest.mock('axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), isAxiosError: jest.fn().mockReturnValue(false) },
}));
jest.mock('./apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedApi = api as jest.Mocked<typeof api>;

describe('fetchPosts', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns the posts array from the response', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { posts: [{ id: '1' }] } });

    await expect(fetchPosts()).resolves.toEqual([{ id: '1' }]);
  });
});

describe('getPost', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns the response data on success', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { id: '1' } });

    await expect(getPost('1')).resolves.toEqual({ id: '1' });
  });

  it('returns null when the request fails', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('network error'));

    await expect(getPost('1')).resolves.toBeNull();
  });
});

describe('getPostsPaginated', () => {
  afterEach(() => jest.clearAllMocks());

  it('computes nextPage when more pages remain', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { posts: [{ id: '1' }], totalPages: 3 },
    });

    await expect(getPostsPaginated(1)).resolves.toEqual({
      nextPage: 2,
      previousPage: undefined,
      posts: [{ id: '1' }],
    });
  });

  it('omits nextPage on the last page', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { posts: [{ id: '1' }], totalPages: 2 },
    });

    await expect(getPostsPaginated(2)).resolves.toEqual({
      nextPage: undefined,
      previousPage: 1,
      posts: [{ id: '1' }],
    });
  });

  it('falls back to an empty page on failure', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('network error'));

    await expect(getPostsPaginated(1)).resolves.toEqual({
      nextPage: undefined,
      previousPage: undefined,
      posts: [],
    });
  });
});

describe('getComment', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns the first element of the response array', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: [{ id: 'comment-1' }] });

    await expect(getComment('post-1', 'comment-1')).resolves.toEqual({
      id: 'comment-1',
    });
  });

  it('returns null when the response array is empty', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: [] });

    await expect(getComment('post-1', 'comment-1')).resolves.toBeNull();
  });

  it('rethrows on failure so React Query sees an error state', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('network error'));

    await expect(getComment('post-1', 'comment-1')).rejects.toThrow(
      'network error'
    );
  });
});

describe('getCommentsPaginated', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns paginated comments on success', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { comments: [{ id: 'c1' }], totalPages: 1 },
    });

    await expect(getCommentsPaginated('post-1', 1)).resolves.toEqual({
      nextPage: undefined,
      previousPage: undefined,
      comments: [{ id: 'c1' }],
    });
  });

  it('falls back to an empty page on failure', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('network error'));

    await expect(getCommentsPaginated('post-1', 1)).resolves.toEqual({
      nextPage: undefined,
      previousPage: undefined,
      comments: [],
    });
  });
});

describe('getSearchResultsPaginated', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns paginated search results on success', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { posts: [{ id: 'p1' }], totalPages: 1 },
    });

    await expect(getSearchResultsPaginated('hello', 1)).resolves.toEqual({
      nextPage: undefined,
      previousPage: undefined,
      posts: [{ id: 'p1' }],
    });
  });
});

describe('getFollowingPostsPaginated', () => {
  afterEach(() => jest.clearAllMocks());

  it('uses the authenticated api client and returns paginated posts', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { posts: [{ id: 'p1' }], totalPages: 2 },
    });

    await expect(getFollowingPostsPaginated(1)).resolves.toEqual({
      nextPage: 2,
      previousPage: undefined,
      posts: [{ id: 'p1' }],
    });
    expect(mockedApi.get).toHaveBeenCalledWith('/api/post/following', {
      params: { page: 1, limit: 5 },
    });
  });

  it('falls back to an empty page on failure', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('network error'));

    await expect(getFollowingPostsPaginated(1)).resolves.toEqual({
      nextPage: undefined,
      previousPage: undefined,
      posts: [],
    });
  });
});

describe('getPostsByAuthorPaginated', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns paginated posts for the given author', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { posts: [{ id: 'p1' }], totalPages: 1 },
    });

    await expect(
      getPostsByAuthorPaginated('author-1', 1)
    ).resolves.toEqual({
      nextPage: undefined,
      previousPage: undefined,
      posts: [{ id: 'p1' }],
    });
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('/api/post/'),
      { params: { page: 1, author: 'author-1', sort: 'createdAt', limit: 5 } }
    );
  });
});
