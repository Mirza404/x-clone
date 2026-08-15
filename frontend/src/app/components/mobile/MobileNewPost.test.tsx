import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import api from '../../utils/apiClient';
import { uploadImages } from '../../utils/imageUtils';
import MobileNewPost from './MobileNewPost';

jest.mock('../../utils/apiClient', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));
jest.mock('../../utils/imageUtils', () => ({
  uploadImages: jest.fn(),
}));
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const mockedApi = api as jest.Mocked<typeof api>;
const mockedUploadImages = uploadImages as jest.Mock;
const mockedUseSession = useSession as jest.Mock;
const mockedToast = toast as unknown as {
  success: jest.Mock;
  error: jest.Mock;
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('MobileNewPost', () => {
  beforeEach(() => {
    mockedUseSession.mockReturnValue({ data: { user: { name: 'Test' } } });
    mockedUploadImages.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('disables the Post button when the textarea is empty', () => {
    renderWithClient(<MobileNewPost onClose={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Post' })).toBeDisabled();
  });

  it('submits content and closes on success', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} });
    const onClose = jest.fn();

    renderWithClient(<MobileNewPost onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText("What's happening?"), {
      target: { value: 'Hello world' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));

    await waitFor(() =>
      expect(mockedApi.post).toHaveBeenCalledWith('/api/post/new', {
        content: 'Hello world',
        images: [],
      })
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mockedToast.success).toHaveBeenCalledWith('Your post was sent.');
  });

  it('shows an error toast and keeps content on failure', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('network error'));
    const onClose = jest.fn();

    renderWithClient(<MobileNewPost onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText("What's happening?"), {
      target: { value: 'Hello world' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));

    await waitFor(() =>
      expect(mockedToast.error).toHaveBeenCalledWith(
        'Error creating post: network error'
      )
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes when the close button is clicked', () => {
    const onClose = jest.fn();
    renderWithClient(<MobileNewPost onClose={onClose} />);

    const closeButton = screen
      .getAllByRole('button')
      .find((button) => button.textContent === '');
    fireEvent.click(closeButton as HTMLElement);

    expect(onClose).toHaveBeenCalled();
  });
});
