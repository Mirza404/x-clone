'use client';

import type React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo } from 'react';
import DropDownMenu from './DropDownMenu';
import type { Post } from '../../types/Post';
import LikeButton from '../ui/LikeButton';
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  MoreHorizontal,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getPost } from '../../utils/fetchInfo';
import { universalHandleClick } from '@/app/utils/handleClick';

export default function PostItem({
  post,
  onDelete,
}: {
  post: Post;
  onDelete: () => void;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const authorId: string = session?.user?.id ?? '';
  const pathname = usePathname();
  const isCurrentPage = useMemo(
    () => pathname === `/posts/${post.id}`,
    [pathname, post.id]
  );
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!post.id) return;
    queryClient.prefetchQuery({
      queryKey: ['posts', post.id],
      queryFn: () => getPost(post.id),
    });
  }, [post.id, queryClient]);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === (post.images?.length ?? 0) - 1 ? 0 : prev + 1
    );
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === 0 ? (post.images?.length ?? 0) - 1 : prev - 1
    );
  };

  return (
    <div
      className="post-hover relative flex w-full min-h-[98px] cursor-pointer flex-row gap-3 border-b border-x-border p-4"
      onClick={
        !isCurrentPage
          ? (e) => universalHandleClick(e, router, 'post', post.id)
          : undefined
      }
    >
      <img
        className="h-12 w-12 flex-shrink-0 rounded-full"
        src={post?.authorImage || '/Logo.png'}
        referrerPolicy="no-referrer"
        alt={`${post.name}'s profile`}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1 text-[15px] text-x-text-secondary">
          <span className="font-bold text-x-text hover:underline">
            {post.name}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {new Date(post.createdAt).toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
        <div className="text-[15px] leading-5 text-x-text break-all whitespace-pre-wrap">
          {showMore ? post.content : `${post.content.substring(0, 300)}`}
          {post.content.length > 300 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMore(!showMore);
              }}
              className="interactive-element ml-1 font-bold text-x-blue hover:underline"
            >
              {showMore ? 'Show less' : 'Show more'}
            </button>
          )}
          {post.images && post.images.length > 0 && (
            <div className="relative mt-3">
              <div className="relative">
                <img
                  src={post.images[currentImageIndex] || '/placeholder.svg'}
                  className="max-h-[512px] w-full rounded-2xl border border-x-border object-cover"
                  alt={`Post image ${currentImageIndex + 1}`}
                />
                {post.images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="interactive-element absolute left-2 top-1/2 -translate-y-1/2 transform rounded-full bg-black/50 p-1 text-white transition-opacity hover:bg-black/75"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="interactive-element absolute right-2 top-1/2 -translate-y-1/2 transform rounded-full bg-black/50 p-1 text-white transition-opacity hover:bg-black/75"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 transform gap-1">
                      {post.images.map((_, index) => (
                        <div
                          key={index}
                          className={`h-1.5 w-1.5 rounded-full ${
                            index === currentImageIndex
                              ? 'bg-white'
                              : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="mt-3 flex max-w-md items-center justify-between">
          <button
            className="interactive-element like-button group flex items-center gap-2 text-x-text-secondary"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/posts/${post.id}`);
            }}
            aria-label="Reply"
          >
            <span className="rounded-full p-2 transition-colors group-hover:bg-x-blue-bg group-hover:text-x-blue">
              <MessageCircle className="h-[18px] w-[18px]" />
            </span>
          </button>
          <div className="like-button" onClick={(e) => e.stopPropagation()}>
            <LikeButton
              type="post"
              targetId={post.id}
              authorId={authorId}
              initialLikes={post.likes}
            />
          </div>
        </div>
      </div>
      <div
        className="interactive-element absolute right-2 top-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="rounded-full p-1.5 text-x-text-secondary transition-colors hover:bg-x-blue-bg hover:text-x-blue"
          onClick={(e) => {
            e.stopPropagation();
            setDropdownOpen(!dropdownOpen);
          }}
          aria-label="More options"
        >
          <MoreHorizontal className="h-[18px] w-[18px]" />
        </button>
        {dropdownOpen && session?.user?.id === post.author && (
          <div className="dropdown-menu">
            <DropDownMenu
              type="post"
              onDelete={onDelete}
              onEdit={() => router.push(`/posts/${post.id}/editPost`)}
              onClose={() => setDropdownOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
