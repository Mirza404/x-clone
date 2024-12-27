import { getPost } from "../fetchInfo";
export default async function Page({ params }: { params: { id: string } }) {
  const id = params.id; // No need to await params
  const post = await getPost(id);
  console.log(post);

  return (
    <div>
      My Post: {id}
      <div>Author: {post.author}</div>
      <div>Content: {post.content}</div>
      <div>Created At: {post.createdAt}</div>
    </div>
  );
}
