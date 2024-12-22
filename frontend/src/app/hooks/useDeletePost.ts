// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import axios from "axios";

// const useDeletePost = () => {
//   const queryClient = useQueryClient();

//   const deleteFunction = async (id: string) => {
//     const endpoint = process.env.NEXT_PUBLIC_SERVER_URL;

//     const { data } = await axios.delete(`${endpoint}/api/post/delete`, {
//       data: { id },
//       headers: {
//         "Content-Type": "application/json",
//       },
//     });
//     queryClient.invalidateQueries({ queryKey: "posts" });

//     return data;
//   };

//   return useMutation(deleteFunction);
// };

// export default useDeletePost;
