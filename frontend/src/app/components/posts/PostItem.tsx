'use client';

import type React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo } from 'react';
import DropDownMenu from './DropDownMenu';
import type { Post } from '../../types/Post';
import LikeButton from '../ui/LikeButton';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
      className="relative flex flex-row p-4 border-b  border-x border-gray-800 bg-black m-0 tweet-content w-full min-h-[98px] post-hover overflow-visible cursor-pointer"
      onClick={
        !isCurrentPage
          ? (e) => universalHandleClick(e, router, 'post', post.id)
          : undefined
      }
    >
      <img
        className="flex items-stretch min-w-10 h-10 rounded-full mr-3"
        src={post?.authorImage || '/Logo.png'}
        referrerPolicy="no-referrer"
      />
      <div className="flex flex-col flex-1">
        <div className="flex items-center mb-0.5 text-sm text-gray-400">
          <span className="font-bold text-white">{post.name}</span>
          <span className="mx-1">·</span>
          <span>
            {new Date(post.createdAt).toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
        <div className="bg-transparent text-sm">
          <div className="text-white break-all whitespace-pre-wrap">
            {showMore ? post.content : `${post.content.substring(0, 300)}`}
            {post.content.length > 300 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMore(!showMore);
                }}
                className="text-blue-500 interactive-element ml-1"
              >
                {showMore ? 'Show less' : 'Read more'}
              </button>
            )}
            {post.images && post.images.length > 0 && (
              <div className="relative mt-2">
                <div className="relative">
                  <img
                    src={post.images[currentImageIndex] || '/placeholder.svg'}
                    className="w-full rounded-lg object-cover max-h-[512px]"
                    alt={`Post image ${currentImageIndex + 1}`}
                  />
                  {post.images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="interactive-element absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 rounded-full p-1 text-white hover:bg-opacity-75 transition-opacity"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="interactive-element absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 rounded-full p-1 text-white hover:bg-opacity-75 transition-opacity"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                        {post.images.map((_, index) => (
                          <div
                            key={index}
                            className={`w-2 h-2 rounded-full ${
                              index === currentImageIndex
                                ? 'bg-white'
                                : 'bg-white bg-opacity-50'
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
        </div>
        <div
          className="flex items-center gap-4 mt-2 like-button"
          onClick={(e) => e.stopPropagation()}
        >
          <LikeButton
            type="post"
            targetId={post.id}
            authorId={authorId}
            initialLikes={post.likes}
          />
        </div>
      </div>
      <div
        className="absolute top-2 right-2 mr-2 interactive-element"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="p-1 rounded-full hover:bg-[#1D9BF0] hover:bg-opacity-20 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setDropdownOpen(!dropdownOpen);
          }}
        >
          <svg
            fill="#9ca3af"
            height="14px"
            width="14px"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            stroke="#9ca3af"
            strokeWidth="0.848"
          >
            <path d="M8,6.5A1.5,1.5,0,1,1,6.5,8,1.5,1.5,0,0,1,8,6.5ZM.5,8A1.5,1.5,0,1,0,2,6.5,1.5,1.5,0,0,0,.5,8Zm12,0A1.5,1.5,0,1,0,14,6.5,1.5,1.5,0,0,0,12.5,8Z"></path>
          </svg>
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
