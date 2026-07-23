import { render, screen } from '@testing-library/react';
import PresenceDot from './PresenceDot';

describe('PresenceDot', () => {
  it('renders when online', () => {
    render(<PresenceDot online={true} />);
    expect(screen.getByLabelText('Online')).toBeInTheDocument();
  });

  it('renders nothing when offline', () => {
    render(<PresenceDot online={false} />);
    expect(screen.queryByLabelText('Online')).not.toBeInTheDocument();
  });
});
