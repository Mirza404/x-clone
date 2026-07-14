import axios from 'axios';
import { getPostsPaginated } from './fetchInfo';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('getPostsPaginated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the posts array from the paginated API response', async () => {
    const posts = [{ id: 'post-1', content: 'hello' }];
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        posts,
        totalPages: 2,
      },
    });

    const result = await getPostsPaginated(1);

    expect(mockedAxios.get).toHaveBeenCalledWith(
      `${process.env.NEXT_PUBLIC_SERVER_URL}/api/post/`,
      {
        params: { page: 1, sort: 'createdAt', limit: 5 },
      }
    );
    expect(result).toEqual({
      nextPage: 2,
      previousPage: undefined,
      posts,
    });
  });

  it('returns an empty posts array when the request fails', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    mockedAxios.get.mockRejectedValueOnce(new Error('network failed'));

    const result = await getPostsPaginated(1);

    expect(result).toEqual({
      nextPage: undefined,
      previousPage: undefined,
      posts: [],
    });
    consoleErrorSpy.mockRestore();
  });
});
