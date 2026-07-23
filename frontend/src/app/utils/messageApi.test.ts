import api from './apiClient';
import {
  getConversations,
  getOrCreateConversation,
  getConversationMessages,
} from './messageApi';

jest.mock('./apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('messageApi', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getConversations returns the conversations array', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { conversations: [{ id: 'c1' }] },
    });

    const result = await getConversations();

    expect(mockedApi.get).toHaveBeenCalledWith('/api/message/conversations');
    expect(result).toEqual([{ id: 'c1' }]);
  });

  it('getConversations returns an empty array on error', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('network error'));

    const result = await getConversations();

    expect(result).toEqual([]);
  });

  it('getOrCreateConversation posts recipientId and returns the conversation id', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { conversation: { _id: 'conv-1' } },
    });

    const result = await getOrCreateConversation('user-2');

    expect(mockedApi.post).toHaveBeenCalledWith('/api/message/conversations', {
      recipientId: 'user-2',
    });
    expect(result).toBe('conv-1');
  });

  it('getOrCreateConversation returns null on error', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('network error'));

    const result = await getOrCreateConversation('user-2');

    expect(result).toBeNull();
  });

  it('getConversationMessages computes nextPage from totalPages', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { messages: [{ _id: 'm1' }], totalPages: 3 },
    });

    const result = await getConversationMessages('conv-1', 1);

    expect(mockedApi.get).toHaveBeenCalledWith(
      '/api/message/conversations/conv-1/messages',
      { params: { page: 1, limit: 20 } }
    );
    expect(result).toEqual({
      nextPage: 2,
      previousPage: undefined,
      messages: [{ _id: 'm1' }],
    });
  });

  it('getConversationMessages omits nextPage on the last page', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { messages: [], totalPages: 2 },
    });

    const result = await getConversationMessages('conv-1', 2);

    expect(result.nextPage).toBeUndefined();
    expect(result.previousPage).toBe(1);
  });

  it('getConversationMessages returns an empty page on error', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('network error'));

    const result = await getConversationMessages('conv-1', 1);

    expect(result).toEqual({
      nextPage: undefined,
      previousPage: undefined,
      messages: [],
    });
  });
});
