// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import axios from "axios";
// const useAddPost = () => {
//   const queryClient = useQueryClient();

//   const addPost = async ({
//     email,
//     content,
//   }: {
//     email: string;
//     content: string;
//   }) => {
//     const endpoint = process.env.NEXT_PUBLIC_SERVER_URL;

//     if (!endpoint) {
//       throw new Error(
//         'Invalid/Missing environment variable: "NEXT_PUBLIC_SERVER_URL"'
//       );
//     }
//     const { data } = await axios.post(
//       `${endpoint}/api/post/new`,
//       {
//         email,
//         content,
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//         },
//       }
//     );
//     queryClient.invalidateQueries({ queryKey: "posts" });

//     return data;
//   };

//   return useMutation(addPost);
// };

// export default useAddPost;
