'use client';
import { getPost } from '../../utils/fetchInfo';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import PostItem from '@/app/components/posts/PostItem';
import LoadCircle from '@/app/components/ui/LoadCircle';

export default function Page({ params }: { params: { id: string } }) {
  const id = params.id;
  const router = useRouter();

  const postsQuery = useQuery({
    queryKey: ['posts', id],
    queryFn: async () => await getPost(id),
  });

  if (postsQuery.isLoading) return <LoadCircle />;
  if (postsQuery.isError) {
    router.push('/posts');
    return null;
  }

  const handleDelete = async () => {
    router.push('/posts');
  };

  return (
    <div className="min-h-screen">
      {postsQuery.data && (
        <PostItem post={postsQuery.data} onDelete={handleDelete} />
      )}
    </div>
  );
}
