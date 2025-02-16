import PostListInfinite from "../app/components/posts/PostListInfinite";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { getPostsPaginated } from "../app/utils/fetchInfo"; // adjust import if necessary

jest.mock("../app/utils/fetchInfo", () => ({
  getPostsPaginated: jest.fn().mockResolvedValue({
    data: { posts: [{}, {}, {}], totalPages: 9, currentPage: 1 },
  }),
}));

const queryClient = new QueryClient();

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
