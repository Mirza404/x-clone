import { KeyboardEvent } from 'react';

type UseEnterSubmitOptions = {
  loading: boolean;
  content: string;
  onSubmit: () => void;
};

export function useEnterSubmit({
  loading,
  content,
  onSubmit,
}: UseEnterSubmitOptions) {
  return (e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (loading || content.trim() === '') return;
      onSubmit();
    }
  };
}
