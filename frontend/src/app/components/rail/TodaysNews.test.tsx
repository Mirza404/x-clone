import { render, screen, fireEvent } from '@testing-library/react';
import TodaysNews from './TodaysNews';

const DISMISS_KEY = 'todaysNewsDismissedUntil';

describe('TodaysNews', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('renders the news card by default', () => {
    render(<TodaysNews />);

    expect(screen.getByText("Today's News")).toBeInTheDocument();
  });

  it('does not render when dismissed for a day is still active', () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 60_000));

    render(<TodaysNews />);

    expect(screen.queryByText("Today's News")).not.toBeInTheDocument();
  });

  it('renders again once the dismissal window has passed', () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() - 1_000));

    render(<TodaysNews />);

    expect(screen.getByText("Today's News")).toBeInTheDocument();
  });

  it('does not render when permanently dismissed', () => {
    localStorage.setItem(DISMISS_KEY, 'Infinity');

    render(<TodaysNews />);

    expect(screen.queryByText("Today's News")).not.toBeInTheDocument();
  });

  it('hides the card and persists the choice when dismissed for a day', async () => {
    render(<TodaysNews />);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    fireEvent.click(await screen.findByText('Dismiss for a day'));

    expect(screen.queryByText("Today's News")).not.toBeInTheDocument();
    expect(Number(localStorage.getItem(DISMISS_KEY))).toBeGreaterThan(
      Date.now()
    );
  });

  it('persists "Infinity" when "Not interested" is chosen', async () => {
    render(<TodaysNews />);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    fireEvent.click(await screen.findByText('Not interested'));

    expect(localStorage.getItem(DISMISS_KEY)).toBe('Infinity');
  });
});
