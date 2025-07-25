'use client';
import { getPost } from '../../utils/fetchInfo';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import PostItem from '@/app/components/posts/PostItem';
import LoadCircle from '@/app/components/ui/LoadCircle';
import { postMutations } from '@/app/utils/postMutations';
import { useQueryClient } from '@tanstack/react-query';
import CommentListInfinite from '@/app/components/comments/CommentListInfinite';
import NewComment from '@/app/components/comments/NewComment';

export default function Page({ params }: { params: { id: string } }) {
  const id = params.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { useDeletePost } = postMutations();

  const postsQuery = useQuery({
    queryKey: ['posts', id],
    queryFn: async () => await getPost(id),
  });
  const deletePostMutation = useDeletePost();

  if (postsQuery.isLoading) return <LoadCircle />;
  if (postsQuery.isError) {
    router.replace('/posts');
    return null;
  }

  return (
    <div className="min-h-screen">
      {postsQuery.data && (
        <PostItem
          post={postsQuery.data}
          onDelete={() =>
            deletePostMutation.mutate(id, {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['posts', id] });
                queryClient.invalidateQueries({ queryKey: ['infinitePosts'] });
              },
            })
          }
        />
      )}
      <NewComment />
      <CommentListInfinite />
    </div>
  );
}
