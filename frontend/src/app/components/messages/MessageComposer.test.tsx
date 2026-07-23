import { render, screen, fireEvent } from '@testing-library/react';
import MessageComposer from './MessageComposer';

describe('MessageComposer', () => {
  it('disables send while empty', () => {
    render(<MessageComposer onSend={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('sends the trimmed content and clears the textarea', () => {
    const onSend = jest.fn();
    render(<MessageComposer onSend={onSend} />);

    const textarea = screen.getByPlaceholderText('Start a new message');
    fireEvent.change(textarea, { target: { value: '  hey  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(onSend).toHaveBeenCalledWith('  hey  ');
    expect(textarea).toHaveValue('');
  });

  it('submits on Enter without Shift', () => {
    const onSend = jest.fn();
    render(<MessageComposer onSend={onSend} />);

    const textarea = screen.getByPlaceholderText('Start a new message');
    fireEvent.change(textarea, { target: { value: 'hi' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(onSend).toHaveBeenCalledWith('hi');
  });

  it('does not submit on Shift+Enter', () => {
    const onSend = jest.fn();
    render(<MessageComposer onSend={onSend} />);

    const textarea = screen.getByPlaceholderText('Start a new message');
    fireEvent.change(textarea, { target: { value: 'hi' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(onSend).not.toHaveBeenCalled();
  });

  it('does not send blank content', () => {
    const onSend = jest.fn();
    render(<MessageComposer onSend={onSend} />);

    const textarea = screen.getByPlaceholderText('Start a new message');
    fireEvent.change(textarea, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(onSend).not.toHaveBeenCalled();
  });
});
