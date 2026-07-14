import type { MouseEvent } from 'react';
import { universalHandleClick } from './handleClick';

function createClickEvent(target: HTMLElement) {
  return {
    target,
  } as unknown as MouseEvent;
}

describe('universalHandleClick', () => {
  it('routes to a post page when a post row is clicked', () => {
    const target = document.createElement('div');
    const router = { push: jest.fn() };

    universalHandleClick(createClickEvent(target), router, 'post', 'post-1');

    expect(router.push).toHaveBeenCalledWith('/posts/post-1');
  });

  it('routes to a comment page when a comment row is clicked', () => {
    const target = document.createElement('div');
    const router = { push: jest.fn() };

    universalHandleClick(
      createClickEvent(target),
      router,
      'comment',
      'post-1',
      'comment-1'
    );

    expect(router.push).toHaveBeenCalledWith('/posts/post-1/comment/comment-1');
  });

  it('ignores clicks from interactive elements inside a row', () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'interactive-element';
    const target = document.createElement('button');
    wrapper.appendChild(target);
    const router = { push: jest.fn() };

    universalHandleClick(createClickEvent(target), router, 'post', 'post-1');

    expect(router.push).not.toHaveBeenCalled();
  });
});
