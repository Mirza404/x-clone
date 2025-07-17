import { MouseEvent } from 'react';

export interface Router {
  push: (url: string) => void;
}

export function universalHandleClick(
  e: MouseEvent,
  router: Router,
  type: 'post' | 'comment',
  postId: string,
  commentId?: string
): void {
  const target = e.target as HTMLElement;
  if (
    target.closest('.interactive-element') ||
    target.closest('.dropdown-menu') ||
    target.closest('.like-button')
  ) {
    return;
  }
  if (type === 'post') {
    router.push(`/posts/${postId}`);
  } else if (type === 'comment' && commentId) {
    router.push(`/posts/${postId}/comment/${commentId}`);
  }
}