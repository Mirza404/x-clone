import axios from "axios";
import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getPostsPaginated, fetchPosts } from "./fetchInfo";
import toast from "react-hot-toast";

const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;

export const useFetchPosts = () => {
  return useQuery({
    queryKey: ["posts"],
    queryFn: fetchPosts,
  });
};

export const useFetchInfinitePosts = () => {
  return useInfiniteQuery({
    queryKey: ["Iposts"],
    queryFn: ({ pageParam = 1 }) => getPostsPaginated(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage || undefined,
  });
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await axios.delete(`${serverUrl}/api/post/delete`, {
        data: { id },
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      toast.success("Post deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["Iposts"] });
    },
    onError: (error: any) => {
      toast.error(`Error deleting post: ${error.message}`);
    },
  });
};
