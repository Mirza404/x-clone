'use client';

import { createContext, useContext, useState } from 'react';
import NewPostModal from '../components/posts/NewPostModal';

interface PostModalContextValue {
  openPostModal: () => void;
  closePostModal: () => void;
}

const PostModalContext = createContext<PostModalContextValue | undefined>(
  undefined
);

export default function PostModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <PostModalContext.Provider
      value={{
        openPostModal: () => setIsOpen(true),
        closePostModal: () => setIsOpen(false),
      }}
    >
      {children}
      {isOpen && <NewPostModal onClose={() => setIsOpen(false)} />}
    </PostModalContext.Provider>
  );
}

export function usePostModal() {
  const ctx = useContext(PostModalContext);
  if (!ctx) {
    throw new Error('usePostModal must be used within a PostModalProvider');
  }
  return ctx;
}
