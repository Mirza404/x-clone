import { render, screen } from '@testing-library/react';
import TypingIndicator from './TypingIndicator';

describe('TypingIndicator', () => {
  it('shows the participant name when provided', () => {
    render(<TypingIndicator name="Ada" />);
    expect(screen.getByText('Ada is typing')).toBeInTheDocument();
  });

  it('falls back to generic text without a name', () => {
    render(<TypingIndicator name={null} />);
    expect(screen.getByText('Typing')).toBeInTheDocument();
  });
});
