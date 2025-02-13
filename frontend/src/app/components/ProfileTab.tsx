import { signIn, signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";

function ProfileTab() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);

  return (
    <div className="relative w-[235px] h-[41px] flex items-center bg-black text-white rounded-full p-[12px] shadow-lg overflow-hidden">
      {session ? (
        <button
          className="flex items-center w-full h-full text-left hover:bg-gray-900 transition delay-50 rounded-full"
          onClick={() => signOut()}
        >
          <img
            className="w-[32px] h-[32px] rounded-full"
            src={session.user?.image ?? "https://via.placeholder.com/150"}
            referrerPolicy="no-referrer"
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
          />
          <div className="flex-1 mx-2 overflow-hidden">
            <span className="block font-bold text-sm truncate">
              {session.user?.name}
            </span>
          </div>
          <span className="flex items-center justify-end">
            <svg
              className="w-6 h-6 text-gray-400 hover:text-white transition"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
                d="M6 12h.01m6 0h.01m5.99 0h.01"
              />
            </svg>
          </span>
        </button>
      ) : (
        <div className="flex items-center w-full h-full justify-center">
          <button
            className="flex items-center hover:bg-gray-900 p-2 rounded-full"
            onClick={() => signIn()}
          >
            <span className="text-sm">Sign In</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default ProfileTab;
