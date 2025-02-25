import PostListInfinite from "../app/components/posts/PostListInfinite";
import { render, waitFor, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { getPostsPaginated } from "../app/utils/fetchInfo"; // adjust import if necessary

jest.mock("../app/utils/fetchInfo", () => ({
  getPostsPaginated: jest.fn().mockResolvedValue({
    data: {
      posts: [
        { id: "67b09166ab6da5751c44645e", content: "wtffff" },
        { id: "67b09166ab6da5751c44645f", content: "test post 2" },
        { id: "67b09166ab6da5751c446460", content: "test post 3" },
      ],
      totalPages: 9,
      currentPage: 1,
    },
  }),
}));

jest.mock("../app/utils/mutations", () => ({
  useFetchPosts: jest.fn().mockReturnValue({
    isLoading: false, // Mock isLoading for useFetchPosts
    isError: false,
    data: null,
  }),
  useFetchInfinitePosts: jest.fn().mockReturnValue({
    data: {
      pages: [
        {
          posts: {
            posts: [
              {
                id: "67b09166ab6da5751c44645e",
                content: "wtffff",
                name: "Scarlet Blue",
                createdAt: "2025-02-15T13:06:46.694Z",
                author: "677c6a67e52f37ce5aac3ca5",
                authorImage:
                  "https://lh3.googleusercontent.com/a/ACg8ocIEUg7u1BPPSjPLT4hZ8fJTJdimzZbwlhZYzJoQO_W31f937mWy=s96-c",
              },
            ],
          },
        },
      ],
    },

    fetchNextPage: jest.fn(),
    hasNextPage: true,
    isFetchingNextPage: false,
    status: "pending",
    isLoading: false,
  }),
  useDeletePost: jest.fn(),
}));

const queryClient = new QueryClient();

afterEach(() => {
  queryClient.clear();
});

test("making sure jest is configured properly", () => {
  expect(true).toBe(true);
});

test("PostListInfinite renders without crashing", async () => {
  const { container } = render(
    <QueryClientProvider client={queryClient}>
      <PostListInfinite />
    </QueryClientProvider>
  );

  await waitFor(() => expect(container).toBeInTheDocument());
});

test("PostListInfinite renders LoadCircle while loading", async () => {
  render(
    <QueryClientProvider client={queryClient}>
      <PostListInfinite />
    </QueryClientProvider>
  );

  await waitFor(() =>
    expect(screen.getByTestId("load-circle-wrapper")).toBeInTheDocument()
  );
});
