export interface Message {
  _id: string;
  conversation: string;
  sender: string;
  content: string;
  readBy: string[];
  deliveredTo: string[];
  createdAt: string;
}
