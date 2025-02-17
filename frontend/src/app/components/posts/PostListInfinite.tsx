import { useState, Fragment, useEffect } from "react";
import type { Post } from "../../utils/fetchInfo";
import { useInView } from "react-intersection-observer";
import PostItem from "./PostItem";
import {
  useFetchPosts,
  useFetchInfinitePosts,
  useDeletePost,
} from "../../utils/mutations";
import LoadCircle from "../ui/LoadCircle";

function PostListInfinite() {
  const { ref, inView } = useInView();
  const postsQuery = useFetchPosts();
  const deletePostMutation = useDeletePost();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useFetchInfinitePosts();

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [fetchNextPage, inView]);

  if (postsQuery.isLoading)
    return (
      <div data-testid="load-circle-wrapper">
        <LoadCircle />
      </div>
      // <LoadCircle data-testid="load-circle"/>
    );
  if (postsQuery.isError) return <pre>Error</pre>;

  if (status === "pending") {
    return (
      <div data-testid="load-circle-wrapper">
        <LoadCircle />
      </div>
    );
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
          <div data-testid="load-circle-wrapper">
            <LoadCircle />
          </div>
        ) : hasNextPage ? (
          "Load More"
        ) : (
          "Nothing more to load."
        )}
      </div>
    </>
  );
}

export default PostListInfinite;
