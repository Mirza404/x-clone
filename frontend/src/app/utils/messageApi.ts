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

// The backend paginates from most-recent backwards. Each page is chronological
// within itself, and nextPage is an opaque cursor pointing further into the
// past. New messages cannot shift that boundary between requests.
export async function getConversationMessages(
  conversationId: string,
  cursor: string | null
) {
  try {
    const params = cursor ? { cursor, limit: 20 } : { limit: 20 };
    const res = await api.get(
      `/api/message/conversations/${conversationId}/messages`,
      { params }
    );

    return {
      nextPage: (res.data.nextCursor as string | null) ?? undefined,
      messages: res.data.messages as Message[],
    };
  } catch (error) {
    console.error(
      'Error fetching messages:',
      getApiErrorMessage(error, 'Error')
    );
    return {
      nextPage: undefined,
      messages: [] as Message[],
    };
  }
}
