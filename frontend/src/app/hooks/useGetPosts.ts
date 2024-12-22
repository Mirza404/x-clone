import axios from "axios";
import { useQuery } from "@tanstack/react-query";

const useGetPosts = () => {
  const fetchPosts = async () => {
    const { data } = await axios.get("http://localhost:3001/api/post/allposts");
    return data.posts;
  };

  return useQuery({
    queryKey: ["posts"], // Query key must be an array
    queryFn: fetchPosts, // The function that fetches the data
  });
};

export default useGetPosts;
