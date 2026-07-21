'use client';

import type React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import DropDownMenu from './DropDownMenu';
import type { Post } from '../../types/Post';
import LikeButton from '../ui/LikeButton';
import Avatar from '../ui/Avatar';
import VerifiedBadge from '../ui/VerifiedBadge';
import ActionButton from '../ui/ActionButton';
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Repeat2,
  Bookmark,
  Share,
  MoreHorizontal,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getPost } from '../../utils/fetchInfo';
import { universalHandleClick } from '@/app/utils/handleClick';
import { toHandle } from '@/app/utils/handle';
import { relativeTime } from '@/app/utils/relativeTime';

export default function PostItem({
  post,
  onDelete,
}: {
  post: Post & { verified?: boolean; commentCount?: number };
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

  const handle = toHandle(post.name);

  return (
    <div
      className="post-hover relative flex w-full min-h-[98px] cursor-pointer flex-row gap-3 border-b border-border p-4"
      onClick={
        !isCurrentPage
          ? (e) => universalHandleClick(e, router, 'post', post.id)
          : undefined
      }
    >
      <Link href={`/profile/${post.author}`} onClick={(e) => e.stopPropagation()}>
        <Avatar
          src={post?.authorImage}
          alt={`${post.name}'s profile`}
          size="lg"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-1 text-[15px] text-muted">
          <Link
            href={`/profile/${post.author}`}
            onClick={(e) => e.stopPropagation()}
            className="font-bold text-content hover:underline"
          >
            {post.name}
          </Link>
          {post.verified && <VerifiedBadge />}
          {handle && <span className="truncate">{handle}</span>}
          <span aria-hidden="true">·</span>
          <span className="flex-shrink-0">{relativeTime(post.createdAt)}</span>
          <button
            className="interactive-element ml-auto rounded-full p-1.5 text-muted transition-colors hover:bg-primary-bg hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              setDropdownOpen(!dropdownOpen);
            }}
            aria-label="More options"
          >
            <MoreHorizontal className="h-[18px] w-[18px]" />
          </button>
          {dropdownOpen && session?.user?.id === post.author && (
            <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
              <DropDownMenu
                type="post"
                onDelete={onDelete}
                onEdit={() => router.push(`/posts/${post.id}/editPost`)}
                onClose={() => setDropdownOpen(false)}
              />
            </div>
          )}
        </div>
        <div className="text-[15px] leading-5 text-content break-words whitespace-pre-wrap">
          {showMore ? post.content : `${post.content.substring(0, 300)}`}
          {post.content.length > 300 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMore(!showMore);
              }}
              className="interactive-element ml-1 font-bold text-primary hover:underline"
            >
              {showMore ? 'Show less' : 'Show more'}
            </button>
          )}
          {post.images && post.images.length > 0 && (
            <div className="relative mt-3">
              <div className="relative">
                <img
                  src={post.images[currentImageIndex] || '/placeholder.svg'}
                  className="max-h-[512px] w-full rounded-2xl border border-border object-cover"
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
        <div className="mt-3 flex max-w-[425px] items-center justify-between">
          <ActionButton
            icon={MessageCircle}
            accent="blue"
            count={post.commentCount ?? 0}
            aria-label="Reply"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/posts/${post.id}`);
            }}
          />
          <ActionButton
            icon={Repeat2}
            accent="green"
            aria-label="Repost"
            onClick={(e) => {
              e.stopPropagation();
              toast('Coming soon');
            }}
          />
          <div onClick={(e) => e.stopPropagation()}>
            <LikeButton
              type="post"
              targetId={post.id}
              authorId={authorId}
              initialLikes={post.likes}
            />
          </div>
          <ActionButton
            icon={Bookmark}
            accent="blue"
            aria-label="Bookmark"
            onClick={(e) => {
              e.stopPropagation();
              toast('Coming soon');
            }}
          />
          <ActionButton
            icon={Share}
            accent="blue"
            aria-label="Share"
            onClick={(e) => {
              e.stopPropagation();
              toast('Coming soon');
            }}
          />
        </div>
      </div>
    </div>
  );
}
