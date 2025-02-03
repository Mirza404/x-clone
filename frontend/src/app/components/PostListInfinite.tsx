"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState, Fragment, useEffect } from "react";
import type { Post } from "../posts/fetchInfo";
import { getPostsPaginated } from "../posts/fetchInfo";
import PostComponent from "../components/Post";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useInView } from "react-intersection-observer";
import type { PostListProps } from "../posts/page";
import DropDownMenu from "../components/DropDownMenu";
import toast from "react-hot-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { fetchPosts } from "../posts/fetchInfo";
import CustomToaster from "../components/CustomToaster";
import { useQueryClient } from "@tanstack/react-query";

function PostListInfinite() {
  const fetchPostsPaginated = ({ pageParam = 1 }) =>
    getPostsPaginated(pageParam);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { ref, inView } = useInView();
  const [showMore, setShowMore] = useState(false);
  const toggleShowMore = () => setShowMore(!showMore);

  const toggleDropdown = (id: string) => {
    setDropdownOpen(dropdownOpen === id ? null : id);
  };

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
    return <p>Loading...</p>;
  }

  if (status === "error") {
    return <p>Error: "Error happened"</p>;
  }

  return (
    <>
      {data?.pages?.map((group, i) => (
        <Fragment key={i}>
          {group?.posts?.posts?.map((post: Post) => (
            
            <div
              key={post.id}
              className="relative group p-4 border border-gray-500 rounded-none shadow-md bg-black m-0 tweet-content w-[598px] min-h-[200px] post-hover"
            >
              
              <img
                className="flex w-10 h-10 rounded-full"
                src={post?.authorImage ?? "https://via.placeholder.com/150"}
                onLoad={() => setLoading(false)}
                onError={() => setLoading(false)}
              />
              {/* Header: Name, date */}
              <div className="flex items-center mb-2 text-sm text-gray-400">
                <span className="font-bold">{post.authorName}</span>
                <span className="mx-1">·</span>
                <span>
                  {new Date(post.createdAt).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              {/* Main part */}
              <div className="bg-transparent text-base ">
                <div className="text-white">
                  {showMore
                    ? post.content
                    : `${post.content.substring(0, 300)}`}
                  {post.content.length > 300 && (
                    <button onClick={toggleShowMore} className="text-blue-500">
                      {showMore ? "Show less" : "Read more"}
                    </button>
                  )}
                </div>
              </div>
              {/* Dropdown */}
              <div className="absolute top-2 right-2 mr-2">
                <button
                  className="p-1 rounded-full hover:bg-gray-800 transition delay-100"
                  onClick={() => toggleDropdown(post.id)}
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

                {dropdownOpen === post.id &&
                  session?.user?.id === post.author &&
                  session && (
                    <DropDownMenu
                      onDelete={() => deletePostMutation.mutate(post.id)}
                      onEdit={() => router.push(`/posts/${post.id}/editPost`)}
                    />
                  )}
              </div>
            </div>
          ))}
        </Fragment>
      ))}
      <div ref={ref}>
        {isFetchingNextPage
          ? "Loading more..."
          : hasNextPage
          ? "Load More"
          : "Nothing more to load"}
      </div>
      <div>{isFetching && !isFetchingNextPage ? "Fetching..." : null}</div>
    </>
  );
}

export default PostListInfinite;
