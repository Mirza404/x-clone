"use client"
import { useState } from "react"
import axios from "axios"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"

interface LikeButtonProps {
  postId: string
  authorId: string
  initialLikes: string[]
}

export default function LikeButton({ postId, authorId, initialLikes }: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(initialLikes.includes(authorId))
  const [likeCount, setLikeCount] = useState(initialLikes.length)
  const queryClient = useQueryClient()
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL

  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(`${serverUrl}/api/post/like`, {
        id: postId,
        authorId,
      })
      return response.data
    },
    onMutate: async () => {
      setIsLiked(!isLiked)
      setLikeCount(isLiked ? likeCount - 1 : likeCount + 1)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] })
    },
    onError: () => {
      setIsLiked(!isLiked)
      setLikeCount(isLiked ? likeCount + 1 : likeCount - 1)
    },
  })

  return (
    <button
      onClick={() => likeMutation.mutate()}
      className="flex items-center gap-2 group"
      aria-label={isLiked ? "Unlike post" : "Like post"}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={isLiked ? "liked" : "unliked"}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {isLiked ? (
            <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="m12.75 20.66 6.184-7.098c2.677-2.884 2.559-6.506.754-8.705-.898-1.095-2.206-1.816-3.72-1.855-1.293-.034-2.652.43-3.963 1.442-1.315-1.012-2.678-1.476-3.973-1.442-1.515.04-2.825.76-3.724 1.855-1.806 2.201-1.915 5.823.772 8.706l6.183 7.097c.19.216.46.34.743.34a.985.985 0 0 0 .743-.34Z" />
            </svg>
          ) : (
            <svg
              className="w-6 h-6 text-gray-500 group-hover:text-red-500 transition-colors"
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
      <AnimatePresence>
        {likeCount > 0 && (
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`text-sm ${isLiked ? "text-red-500" : "text-gray-500"}`}
          >
            {likeCount}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}

