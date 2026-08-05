import { render, screen, fireEvent } from '@testing-library/react';
import BackendWakingBanner from './BackendWakingBanner';
import { useBackendWaking } from '@/app/hooks/useBackendWaking';

jest.mock('@/app/hooks/useBackendWaking', () => ({
  useBackendWaking: jest.fn(),
}));

const mockedUseBackendWaking = useBackendWaking as jest.Mock;

describe('BackendWakingBanner', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when the backend is ok', () => {
    mockedUseBackendWaking.mockReturnValue('ok');
    const { container } = render(<BackendWakingBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows a waking message', () => {
    mockedUseBackendWaking.mockReturnValue('waking');
    render(<BackendWakingBanner />);

    expect(screen.getByText(/Waking the server up/)).toBeInTheDocument();
  });

  it('shows an unreachable message', () => {
    mockedUseBackendWaking.mockReturnValue('unreachable');
    render(<BackendWakingBanner />);

    expect(screen.getByText(/Can't reach the server/)).toBeInTheDocument();
  });

  it('hides once dismissed', () => {
    mockedUseBackendWaking.mockReturnValue('waking');
    const { container } = render(<BackendWakingBanner />);

    fireEvent.click(screen.getByLabelText('Dismiss'));

    expect(container).toBeEmptyDOMElement();
  });
});
