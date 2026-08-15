import api from './apiClient';
import {
  getConversations,
  getOrCreateConversation,
  getConversationMessages,
  markConversationRead,
} from './messageApi';

jest.mock('./apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
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

  it('getConversationMessages returns the next history cursor', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { messages: [{ _id: 'm1' }], nextCursor: 'cursor-2' },
    });

    const result = await getConversationMessages('conv-1', null);

    expect(mockedApi.get).toHaveBeenCalledWith(
      '/api/message/conversations/conv-1/messages',
      { params: { limit: 20 } }
    );
    expect(result).toEqual({
      nextPage: 'cursor-2',
      messages: [{ _id: 'm1' }],
    });
  });

  it('getConversationMessages sends a cursor and stops on the oldest page', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { messages: [], nextCursor: null },
    });

    const result = await getConversationMessages('conv-1', 'cursor-2');

    expect(mockedApi.get).toHaveBeenCalledWith(
      '/api/message/conversations/conv-1/messages',
      { params: { cursor: 'cursor-2', limit: 20 } }
    );
    expect(result.nextPage).toBeUndefined();
  });

  it('getConversationMessages returns an empty page on error', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('network error'));

    const result = await getConversationMessages('conv-1', null);

    expect(result).toEqual({
      nextPage: undefined,
      messages: [],
    });
  });

  it('markConversationRead patches the read endpoint and returns true', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: {} });

    const result = await markConversationRead('conv-1');

    expect(mockedApi.patch).toHaveBeenCalledWith(
      '/api/message/conversations/conv-1/read'
    );
    expect(result).toBe(true);
  });

  it('markConversationRead returns false on error', async () => {
    mockedApi.patch.mockRejectedValueOnce(new Error('network error'));

    const result = await markConversationRead('conv-1');

    expect(result).toBe(false);
  });
});
