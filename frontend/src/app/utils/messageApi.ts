import api from './apiClient';
import { getApiErrorMessage } from './apiError';
import type { ConversationSummary } from '../types/Conversation';
import type { Message } from '../types/Message';

export async function getConversations(): Promise<ConversationSummary[]> {
  try {
    const res = await api.get('/api/message/conversations');
    return res.data.conversations;
  } catch (error) {
    console.error(
      'Error fetching conversations:',
      getApiErrorMessage(error, 'Error')
    );
    return [];
  }
}

export async function markConversationRead(
  conversationId: string
): Promise<boolean> {
  try {
    await api.patch(`/api/message/conversations/${conversationId}/read`);
    return true;
  } catch (error) {
    console.error(
      'Error marking conversation as read:',
      getApiErrorMessage(error, 'Error')
    );
    return false;
  }
}

export async function getOrCreateConversation(
  recipientId: string
): Promise<string | null> {
  try {
    const res = await api.post('/api/message/conversations', { recipientId });
    return res.data.conversation._id as string;
  } catch (error) {
    console.error(
      'Error creating conversation:',
      getApiErrorMessage(error, 'Error')
    );
    return null;
  }
}

// The backend paginates from most-recent backwards: page 1 is the newest
// window (chronological within itself), page 2 the window before that, etc.
// nextPage therefore points further into the past, not forward in time.
export async function getConversationMessages(
  conversationId: string,
  page: number
) {
  try {
    const res = await api.get(
      `/api/message/conversations/${conversationId}/messages`,
      { params: { page, limit: 20 } }
    );
    const totalPages = res.data.totalPages;
    const hasNext = page < totalPages;

    return {
      nextPage: hasNext ? page + 1 : undefined,
      previousPage: page > 1 ? page - 1 : undefined,
      messages: res.data.messages as Message[],
    };
  } catch (error) {
    console.error(
      'Error fetching messages:',
      getApiErrorMessage(error, 'Error')
    );
    return {
      nextPage: undefined,
      previousPage: undefined,
      messages: [] as Message[],
    };
  }
}
