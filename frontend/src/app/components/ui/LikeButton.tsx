"use client";
import { useState } from "react";
import axios from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface LikeButtonProps {
  postId: string;
  authorId: string;
  initialLikes: string[];
}

export default function LikeButton({
  postId,
  authorId,
  initialLikes,
}: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(initialLikes.includes(authorId));
  const [likeCount, setLikeCount] = useState(initialLikes.length);
  const queryClient = useQueryClient();
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;

  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(`${serverUrl}/api/post/like`, {
        id: postId,
        authorId,
      });
      return response.data;
    },
    onMutate: async () => {
      // Optimistic update
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: () => {
      // Revert optimistic update on error
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount + 1 : likeCount - 1);
    },
  });

  return (
    <button
      onClick={() => likeMutation.mutate()}
      className="flex items-center gap-2"
      aria-label={isLiked ? "Unlike post" : "Like post"}
    >
      {isLiked ? (
        <svg
          className="w-6 h-6 text-red-500"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="m12.75 20.66 6.184-7.098c2.677-2.884 2.559-6.506.754-8.705-.898-1.095-2.206-1.816-3.72-1.855-1.293-.034-2.652.43-3.963 1.442-1.315-1.012-2.678-1.476-3.973-1.442-1.515.04-2.825.76-3.724 1.855-1.806 2.201-1.915 5.823.772 8.706l6.183 7.097c.19.216.46.34.743.34a.985.985 0 0 0 .743-.34Z" />
        </svg>
      ) : (
        <svg
          className="w-6 h-6 text-gray-500 hover:text-red-500 transition-colors"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12.01 6.001C6.5 1 1 8 5.782 13.001L12.011 20l6.23-7C23 8 17.5 1 12.01 6.002Z"
          />
        </svg>
      )}
      {likeCount > 0 && (
        <span
          className={`text-sm ${isLiked ? "text-red-500" : "text-gray-500"}`}
        >
          {likeCount}
        </span>
      )}
    </button>
  );
}
