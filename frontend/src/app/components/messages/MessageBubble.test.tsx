import { fireEvent, render, screen } from '@testing-library/react';
import MessageBubble from './MessageBubble';
import type { Message } from '@/app/types/Message';

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    _id: 'm1',
    conversation: 'conv-1',
    sender: 'user-1',
    content: 'hello there',
    images: [],
    readBy: [],
    createdAt: new Date(0).toISOString(),
    ...overrides,
  };
}

describe('MessageBubble', () => {
  it('renders the message content', () => {
    render(<MessageBubble message={makeMessage()} isMine={false} />);
    expect(screen.getByText('hello there')).toBeInTheDocument();
  });

  it('shows a sending indicator for an in-flight message', () => {
    render(
      <MessageBubble
        message={makeMessage({ status: 'sending' })}
        isMine={true}
      />
    );
    expect(screen.getByText('Sending...')).toBeInTheDocument();
  });

  it('shows a failed indicator when the send failed', () => {
    render(
      <MessageBubble
        message={makeMessage({ status: 'failed' })}
        isMine={true}
      />
    );
    expect(screen.getByText('Failed to send')).toBeInTheDocument();
  });

  it('offers retry for a failed message and passes its temporary id', () => {
    const onRetry = jest.fn();
    render(
      <MessageBubble
        message={makeMessage({ _id: 'temp-1', status: 'failed' })}
        isMine={true}
        onRetry={onRetry}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledWith('temp-1');
  });

  it('shows "Read" when seenByPeer is true', () => {
    render(
      <MessageBubble message={makeMessage()} isMine={true} seenByPeer={true} />
    );
    expect(screen.getByText('Read')).toBeInTheDocument();
  });

  it('shows the relative time when not seen', () => {
    render(
      <MessageBubble message={makeMessage()} isMine={true} seenByPeer={false} />
    );
    expect(screen.queryByText('Read')).not.toBeInTheDocument();
  });
});
