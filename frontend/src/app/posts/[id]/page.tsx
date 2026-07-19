'use client';
import { use } from 'react';
import { getPost } from '../../utils/fetchInfo';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import PostItem from '@/app/components/posts/PostItem';
import LoadCircle from '@/app/components/ui/LoadCircle';
import { usePostMutations } from '@/app/utils/postMutations';
import { useQueryClient } from '@tanstack/react-query';
import CommentListInfinite from '@/app/components/comments/CommentListInfinite';
import NewComment from '@/app/components/comments/NewComment';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { useDeletePost } = usePostMutations();

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
      <div className="sticky top-0 z-20 flex items-center gap-6 border-b border-border bg-bg/85 px-4 py-2 backdrop-blur">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full text-content transition-colors hover:bg-hover"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-content">Post</h1>
      </div>
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
