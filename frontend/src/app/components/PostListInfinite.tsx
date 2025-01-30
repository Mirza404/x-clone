import { useInfiniteQuery } from "@tanstack/react-query";
import { useState, Fragment } from "react";
import type { Post } from "../components/Post";
import { getPostsPaginated } from "../posts/fetchInfo";

function PostListInfinite() {
  const fetchPosts = ({ pageParam = 0 }) => getPostsPaginated(pageParam);
  const [page, setPage] = useState(0);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["Iposts"],
    queryFn: fetchPosts,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage || undefined,
  });

  if (status === "pending") {
    return <p>Loading...</p>;
  }

  if (status === "error") {
    return <p>Error: "Error happened"</p>;
  }
  console.log("data:", data);
  
  

  return (
    <>
      {data?.pages?.map((group, i) => (
        <Fragment key={i}>
          {group?.posts?.data?.map((post: Post) => (
            <p key={post.id}>{post.name}</p>
          ))}
        </Fragment>
      ))}
      <div>
        <button
          onClick={() => fetchNextPage()}
          disabled={!hasNextPage || isFetchingNextPage}
        >
          {isFetchingNextPage
            ? "Loading more..."
            : hasNextPage
            ? "Load More"
            : "Nothing more to load"}
        </button>
      </div>
      <div>{isFetching && !isFetchingNextPage ? "Fetching..." : null}</div>
    </>
  );
}

export default PostListInfinite;
