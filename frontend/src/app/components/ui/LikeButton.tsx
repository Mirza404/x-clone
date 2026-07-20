'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import api from '../../utils/apiClient';

interface LikeButtonProps {
  type: 'post' | 'comment';
  targetId: string;
  authorId: string;
  initialLikes: string[];
}

export default function LikeButton({
  type,
  targetId,
  authorId,
  initialLikes,
}: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(initialLikes.includes(authorId));
  const [likeCount, setLikeCount] = useState(initialLikes.length);
  const [prevInitialLikes, setPrevInitialLikes] = useState(initialLikes);
  const [prevAuthorId, setPrevAuthorId] = useState(authorId);
  const queryClient = useQueryClient();
  const params = useParams();

  if (initialLikes !== prevInitialLikes || authorId !== prevAuthorId) {
    setPrevInitialLikes(initialLikes);
    setPrevAuthorId(authorId);
    setIsLiked(initialLikes.includes(authorId));
    setLikeCount(initialLikes.length);
  }

  const likeMutation = useMutation({
    mutationFn: async () => {
      let endpoint = '';
      const payload = { id: targetId };

      if (type !== 'post') {
        const postId = params.id as string;
        endpoint = `/api/post/${postId}/comment/like`;
      } else {
        endpoint = `/api/post/like`;
      }

      const response = await api.post(endpoint, payload);
      return response.data;
    },
    onMutate: async () => {
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
    onError: () => {
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount + 1 : likeCount - 1);
    },
  });

  return (
    <button
      onClick={() => likeMutation.mutate()}
      className="interactive-element group flex items-center gap-0.5"
      aria-label={isLiked ? 'Unlike post' : 'Like post'}
    >
      <span
        className={`rounded-full p-2 transition-colors ${
          isLiked
            ? 'text-like'
            : 'text-muted group-hover:bg-like-bg group-hover:text-like'
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={isLiked ? 'liked' : 'unliked'}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {isLiked ? (
              <svg
                className="h-[18px] w-[18px]"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="m12.75 20.66 6.184-7.098c2.677-2.884 2.559-6.506.754-8.705-.898-1.095-2.206-1.816-3.72-1.855-1.293-.034-2.652.43-3.963 1.442-1.315-1.012-2.678-1.476-3.973-1.442-1.515.04-2.825.76-3.724 1.855-1.806 2.201-1.915 5.823.772 8.706l6.183 7.097c.19.216.46.34.743.34a.985.985 0 0 0 .743-.34Z" />
              </svg>
            ) : (
              <svg
                className="h-[18px] w-[18px]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12.01 6.001C6.5 1 1 8 5.782 13.001L12.011 20l6.23-7C23 8 17.5 1 12.01 6.002Z"
                />
              </svg>
            )}
          </motion.div>
        </AnimatePresence>
      </span>
      <AnimatePresence>
        {likeCount > 0 && (
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`text-[13px] ${isLiked ? 'text-like' : 'text-muted'}`}
          >
            {likeCount}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
