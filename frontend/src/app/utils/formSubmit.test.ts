import type { KeyboardEvent } from 'react';
import { useEnterSubmit } from './formSubmit';

function createEnterEvent(
  overrides: Partial<KeyboardEvent<HTMLTextAreaElement>> = {}
) {
  return {
    key: 'Enter',
    shiftKey: false,
    preventDefault: jest.fn(),
    ...overrides,
  } as unknown as KeyboardEvent<HTMLTextAreaElement>;
}

describe('useEnterSubmit', () => {
  it('submits trimmed content on Enter', () => {
    const onSubmit = jest.fn();
    const event = createEnterEvent();
    const onKeyDown = useEnterSubmit({
      loading: false,
      content: ' hello ',
      onSubmit,
    });

    onKeyDown(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('does not submit when Shift+Enter inserts a newline', () => {
    const onSubmit = jest.fn();
    const event = createEnterEvent({ shiftKey: true });
    const onKeyDown = useEnterSubmit({
      loading: false,
      content: 'hello',
      onSubmit,
    });

    onKeyDown(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('prevents Enter but skips submit while loading or empty', () => {
    const onSubmit = jest.fn();
    const event = createEnterEvent();
    const onKeyDown = useEnterSubmit({
      loading: true,
      content: 'hello',
      onSubmit,
    });

    onKeyDown(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
