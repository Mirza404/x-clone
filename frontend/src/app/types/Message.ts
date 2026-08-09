export interface Message {
  _id: string;
  conversation: string;
  sender: string;
  clientId?: string;
  content: string;
  images: string[];
  readBy: string[];
  deliveredTo: string[];
  createdAt: string;
  // Client-only: set while an optimistic send is in flight or has failed.
  // Never present on a message the backend returned.
  status?: 'sending' | 'failed';
}
