"use client";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { usePathname } from "next/navigation";

const ACTIVE_ROUTE = "py-1 px-2 text-gray-300 bg-gray-700";
const INACTIVE_ROUTE =
  "py-1 px-2 text-gray-500 hover:text-gray-300 hover:bg-gray-700";

function AuthButton() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);

  return (
    <div className="flex flex-col items-center justify-center rounded overflow-hidden shadow-lg ">
      {session ? (
        <div className="flex flex-col items-center">
          {loading && (
            <div className="spinner">
              <div className="w-10 h-10 border-4 border-t-blue-500 border-gray-300 rounded-full animate-spin"></div>
            </div>
          )}
          <img
            className="w-24 h-24 rounded-full border border-gray-300"
            src={session.user?.image ?? "https://via.placeholder.com/150"}
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
          />
          <div className="px-6 py-4 text-center">
            <div className="font-bold text-xl mb-2">{session.user?.name}</div>
          </div>
          <button
            className=" flex rounded-full p-2 text-white hover:bg-white hover:text-black transition delay-50 text-left"
            onClick={() => signOut()}
          >
            Sign out
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <img
            className="w-24 h-24 rounded-full border border-gray-300"
            src="https://via.placeholder.com/150"
            alt="Placeholder Image"
          />
          <div className="px-6 py-4 text-center">
            <div className="font-bold text-xl mb-2">Not signed in</div>
          </div>
          <div className="flex items-center justify-center">
            <button
              className=" flex rounded-full p-2 text-white hover:bg-white hover:text-black transition delay-50 text-left"
              onClick={() => signIn()}
            >
              Sign in
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NavMenu() {
  const pathname = usePathname();
  return (
    <div>
      <nav className="m-5 px-2">
        <AuthButton />
        <hr className="my-4" />
        <ul>
          <Link href="/posts">
            <li className=" flex rounded-full py-1 px-2 text-white hover:text-gray-300 hover:bg-gray-700 transition delay-50 text-left">
              <span className="m-1">
                <svg
                  className="w-6 h-6 text-gray-800 dark:text-white"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  fill="#ffffff"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M11.293 3.293a1 1 0 0 1 1.414 0l6 6 2 2a1 1 0 0 1-1.414 1.414L19 12.414V19a2 2 0 0 1-2 2h-3a1 1 0 0 1-1-1v-3h-2v3a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2v-6.586l-.293.293a1 1 0 0 1-1.414-1.414l2-2 6-6Z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              Home
            </li>
          </Link>
          <Link href="/protected">
            <li className=" flex rounded-full py-1 px-2 text-white hover:text-gray-300 hover:bg-gray-700 transition delay-50 text-left">
              <span className="m-1">
                <svg
                  className="w-6 h-6 text-gray-800 dark:text-white"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12.356 3.066a1 1 0 0 0-.712 0l-7 2.666A1 1 0 0 0 4 6.68a17.695 17.695 0 0 0 2.022 7.98 17.405 17.405 0 0 0 5.403 6.158 1 1 0 0 0 1.15 0 17.406 17.406 0 0 0 5.402-6.157A17.694 17.694 0 0 0 20 6.68a1 1 0 0 0-.644-.949l-7-2.666Z" />
                </svg>
              </span>
              Protected Route
            </li>
          </Link>
          <Link href="/newPost">
            <li className=" flex rounded-full py-1 px-2 text-white hover:text-gray-300 hover:bg-gray-700 transition delay-50 text-left">
              <span className="m-1">
                <svg
                  className="w-6 h-6 text-gray-800 dark:text-white"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4.243a1 1 0 1 0-2 0V11H7.757a1 1 0 1 0 0 2H11v3.243a1 1 0 1 0 2 0V13h3.243a1 1 0 1 0 0-2H13V7.757Z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              Create Post
            </li>
          </Link>
        </ul>
      </nav>
    </div>
  );
}
