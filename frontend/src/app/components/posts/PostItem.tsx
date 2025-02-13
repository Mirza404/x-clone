import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DropDownMenu from "./DropDownMenu";
import type { Post } from "../../utils/fetchInfo";

export default function PostItem({
  post,
  onDelete,
}: {
  post: Post;
  onDelete: () => void;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="relative flex flex-row group p-4 border border-gray-500 rounded-none shadow-md bg-black m-0 tweet-content w-[598px] min-h-[98px] post-hover overflow-visible">
      <img
        className="flex items-stretch min-w-10 h-10 rounded-full mr-2"
        src={post?.authorImage ?? "https://via.placeholder.com/150"}
        referrerPolicy="no-referrer"
      />
      {/* Header: Name, date */}
      <div className="flex flex-col">
        <div className="flex items-center mb-0 text-sm text-gray-400">
          <span className="font-bold">{post.name}</span>
          <span className="mx-1">·</span>
          <span>
            {new Date(post.createdAt).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
        {/* Main part */}
        <div className="bg-transparent text-sm ">
          <div className="text-white">
            {showMore ? post.content : `${post.content.substring(0, 300)}`}
            {post.content.length > 300 && (
              <button
                onClick={() => setShowMore(!showMore)}
                className="text-blue-500"
              >
                {showMore ? "Show less" : "Read more"}
              </button>
            )}
            {post.images?.length > 0 && (
              <div>
                {post.images.map((image, i) => (
                  <img
                    key={i}
                    src={image}
                    className="mt-2 w-full p-3 pl-0 object-cover rounded-lg"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Dropdown */}
      <div className="absolute top-2 right-2 mr-2">
        <button
          className="p-1 rounded-full hover:bg-[#1D9BF0] hover:bg-opacity-20 transition delay-100 hover-svg"
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <svg
            fill="#9ca3af"
            height="14px"
            width="14px"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            stroke="#9ca3af"
            strokeWidth="0.848"
          >
            <path d="M8,6.5A1.5,1.5,0,1,1,6.5,8,1.5,1.5,0,0,1,8,6.5ZM.5,8A1.5,1.5,0,1,0,2,6.5,1.5,1.5,0,0,0,.5,8Zm12,0A1.5,1.5,0,1,0,14,6.5,1.5,1.5,0,0,0,12.5,8Z"></path>
          </svg>
        </button>

        {dropdownOpen && session?.user?.id === post.author && (
          <DropDownMenu
            onDelete={onDelete}
            onEdit={() => router.push(`/posts/${post.id}/editPost`)}
          />
        )}
      </div>
    </div>
  );
}
