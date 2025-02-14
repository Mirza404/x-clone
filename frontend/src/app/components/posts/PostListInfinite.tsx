"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState, Fragment, useEffect } from "react";
import type { Post } from "../../utils/fetchInfo";
import { getPostsPaginated } from "../../utils/fetchInfo";
import { useRouter } from "next/navigation";
import { useInView } from "react-intersection-observer";
import PostItem from "./PostItem";
import toast from "react-hot-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { fetchPosts } from "../../utils/fetchInfo";
import { useQueryClient } from "@tanstack/react-query";
import LoadCircle from "../ui/LoadCircle";

function PostListInfinite() {
  const fetchPostsPaginated = ({ pageParam = 1 }) =>
    getPostsPaginated(pageParam);
  const [loading, setLoading] = useState(true);
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { ref, inView } = useInView();

  const postsQuery = useQuery({
    queryKey: ["posts"],
    queryFn: () => fetchPosts(),
  });

  const deletePostMutation = useMutation({
    mutationFn: async (id: string) => {
      setLoading(true);
      try {
        return await axios.delete(`${serverUrl}/api/post/delete`, {
          data: { id },
          headers: {
            "Content-Type": "application/json",
          },
        });
      } catch (error: any) {
        throw new Error(error.message);
      } finally {
        setLoading(false);
      }
    },
    onSuccess: () => {
      toast.success("Post deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["Iposts"] }); // Invalidates the infinite query
    },
    onError: (error: any) => {
      toast.error(`Error deleting post: ${error.message}`);
    },
  });

  if (postsQuery.isLoading)
    return (
      <div className="flex justify-center p-4 min-w-[600px] min-h-[200px]">
        <div className="w-10 h-10 border-4 border-t-blue-500 border-gray-300 rounded-full animate-spin"></div>
      </div>
    );
  if (postsQuery.isError) return <pre>Error</pre>;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["Iposts"],
    queryFn: fetchPostsPaginated,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage || undefined,
  });

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [fetchNextPage, inView]);

  if (status === "pending") {
    <LoadCircle />;
  }

  if (status === "error") {
    return <p>Error: "Error happened"</p>;
  }

  return (
    <>
      {data?.pages?.map((group, i) => (
        <Fragment key={i}>
          {group?.posts?.posts?.map((post: Post) => (
            <PostItem
              key={post.id}
              post={post}
              onDelete={() => deletePostMutation.mutate(post.id)}
            />
          ))}
        </Fragment>
      ))}
      <div ref={ref}>
        {isFetchingNextPage ? (
          <LoadCircle />
        ) : hasNextPage ? (
          "Load More"
        ) : (
          "Nothing more to load."
        )}
      </div>
      <div>{isFetching && !isFetchingNextPage ? "Fetching..." : null}</div>
    </>
  );
}

export default PostListInfinite;
