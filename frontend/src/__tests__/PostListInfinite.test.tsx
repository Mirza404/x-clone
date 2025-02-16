import PostListInfinite from "../app/components/posts/PostListInfinite";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { getPostsPaginated } from "../app/utils/fetchInfo"; // adjust import if necessary

// Mock the API call
jest.mock("../app/utils/fetchInfo", () => ({
  getPostsPaginated: jest.fn().mockResolvedValue({
    data: { posts: [{}, {}, {}], totalPages: 9, currentPage: 1 },
  }),
}));

const queryClient = new QueryClient();

test("PostListInfinite renders without crashing", async () => {
  const { container } = render(
    <QueryClientProvider client={queryClient}>
      <PostListInfinite />
    </QueryClientProvider>
  );

  // Wait for async operations to finish
  await waitFor(() => expect(container).toBeInTheDocument());
});
