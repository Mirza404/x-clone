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
        <ul>
          <Link href="/posts">
            <li
              className={`flex items-center rounded-full py-1 px-2 text-white hover:text-gray-300 hover:bg-gray-900 transition delay-50 text-left my-2 ${
                pathname === "/posts" ? "font-bold" : ""
              }`}
            >
              {pathname === "/posts" ? (
                <div className="flex">
                  <span className="flex items-center m-1">
                    <svg
                      className="w-6 h-6 text-gray-800 dark:text-white"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fillRule="evenodd"
                        d="M11.293 3.293a1 1 0 0 1 1.414 0l6 6 2 2a1 1 0 0 1-1.414 1.414L19 12.414V19a2 2 0 0 1-2 2h-3a1 1 0 0 1-1-1v-3h-2v3a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2v-6.586l-.293.293a1 1 0 0 1-1.414-1.414l2-2 6-6Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <span className="m-1">Home</span>
                </div>
              ) : (
                <div className="flex">
                  <span className="flex items-center m-1">
                    <svg
                      className="w-6 h-6 text-gray-800 dark:text-white"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="m4 12 8-8 8 8M6 10.5V19a1 1 0 0 0 1 1h3v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h3a1 1 0 0 0 1-1v-8.5"
                      />
                    </svg>
                  </span>
                  <span className="m-1">Home</span>
                </div>
              )}
            </li>
          </Link>
          <Link href="/explore">
            <li
              className={`flex items-center rounded-full py-1 px-2 text-white hover:text-gray-300 hover:bg-gray-900 transition delay-50 text-left my-2 ${
                pathname === "/explore" ? "font-bold" : ""
              }`}
            >
              {pathname === "/explore" ? (
                <div className="flex">
                  <span className="flex items-center m-1">
                    <svg
                      className="w-6 h-6 text-gray-800 dark:text-white"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z" />
                      <path
                        fill-rule="evenodd"
                        d="M21.707 21.707a1 1 0 0 1-1.414 0l-3.5-3.5a1 1 0 0 1 1.414-1.414l3.5 3.5a1 1 0 0 1 0 1.414Z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </span>
                  <span className="m-1">Explore</span>
                </div>
              ) : (
                <div className="flex">
                  <span className="flex items-center m-1">
                    <svg
                      className="w-6 h-6 text-gray-800 dark:text-white"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-width="2"
                        d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                      />
                    </svg>
                  </span>
                  <span className="m-1">Explore</span>
                </div>
              )}
            </li>
          </Link>
          <Link href="/notifications">
            <li
              className={`flex items-center rounded-full py-1 px-2 text-white hover:text-gray-300 hover:bg-gray-900 transition delay-50 text-left my-2 ${
                pathname === "/notifications" ? "font-bold" : ""
              }`}
            >
              {pathname === "/notifications" ? (
                <div className="flex">
                  <span className="flex items-center m-1">
                    <svg
                      className="w-6 h-6 text-gray-800 dark:text-white"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.133 12.632v-1.8a5.406 5.406 0 0 0-4.154-5.262.955.955 0 0 0 .021-.106V3.1a1 1 0 0 0-2 0v2.364a.955.955 0 0 0 .021.106 5.406 5.406 0 0 0-4.154 5.262v1.8C6.867 15.018 5 15.614 5 16.807 5 17.4 5 18 5.538 18h12.924C19 18 19 17.4 19 16.807c0-1.193-1.867-1.789-1.867-4.175ZM8.823 19a3.453 3.453 0 0 0 6.354 0H8.823Z" />
                    </svg>
                  </span>
                  <span className="m-1">Notifications</span>
                </div>
              ) : (
                <div className="flex">
                  <span className="flex items-center m-1">
                    <svg
                      className="w-6 h-6 text-gray-800 dark:text-white"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 5.365V3m0 2.365a5.338 5.338 0 0 1 5.133 5.368v1.8c0 2.386 1.867 2.982 1.867 4.175 0 .593 0 1.292-.538 1.292H5.538C5 18 5 17.301 5 16.708c0-1.193 1.867-1.789 1.867-4.175v-1.8A5.338 5.338 0 0 1 12 5.365ZM8.733 18c.094.852.306 1.54.944 2.112a3.48 3.48 0 0 0 4.646 0c.638-.572 1.236-1.26 1.33-2.112h-6.92Z"
                      />
                    </svg>
                  </span>
                  <span className="m-1">Notifications</span>
                </div>
              )}
            </li>
          </Link>
          <Link href="/messages">
            <li
              className={`flex items-center rounded-full py-1 px-2 text-white hover:text-gray-300 hover:bg-gray-900 transition delay-50 text-left my-2 ${
                pathname === "/messages" ? "font-bold" : ""
              }`}
            >
              {pathname === "/messages" ? (
                <div className="flex">
                  <span className="flex items-center m-1">
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
                        fill-rule="evenodd"
                        d="M4 3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h1v2a1 1 0 0 0 1.707.707L9.414 13H15a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4Z"
                        clip-rule="evenodd"
                      />
                      <path
                        fill-rule="evenodd"
                        d="M8.023 17.215c.033-.03.066-.062.098-.094L10.243 15H15a3 3 0 0 0 3-3V8h2a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-1v2a1 1 0 0 1-1.707.707L14.586 18H9a1 1 0 0 1-.977-.785Z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </span>
                  <span className="m-1">Messages</span>
                </div>
              ) : (
                <div className="flex">
                  <span className="flex items-center m-1">
                    <svg
                      className="w-6 h-6 text-gray-800 dark:text-white"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 17h6l3 3v-3h2V9h-2M4 4h11v8H9l-3 3v-3H4V4Z"
                      />
                    </svg>
                  </span>
                  <span className="m-1">Messages</span>
                </div>
              )}
            </li>
          </Link>
          <Link href="/bookmarks">
            <li
              className={`flex items-center rounded-full py-1 px-2 text-white hover:text-gray-300 hover:bg-gray-900 transition delay-50 text-left my-2 ${
                pathname === "/bookmarks" ? "font-bold" : ""
              }`}
            >
              {pathname === "/bookmarks" ? (
                <div className="flex">
                  <span className="flex items-center m-1">
                    <svg
                      className="w-6 h-6 text-gray-800 dark:text-white"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M7.833 2c-.507 0-.98.216-1.318.576A1.92 1.92 0 0 0 6 3.89V21a1 1 0 0 0 1.625.78L12 18.28l4.375 3.5A1 1 0 0 0 18 21V3.889c0-.481-.178-.954-.515-1.313A1.808 1.808 0 0 0 16.167 2H7.833Z" />
                    </svg>
                  </span>
                  <span className="m-1">Bookmarks</span>
                </div>
              ) : (
                <div className="flex">
                  <span className="flex items-center m-1">
                    <svg
                      className="w-6 h-6 text-gray-800 dark:text-white"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="m17 21-5-4-5 4V3.889a.92.92 0 0 1 .244-.629.808.808 0 0 1 .59-.26h8.333a.81.81 0 0 1 .589.26.92.92 0 0 1 .244.63V21Z"
                      />
                    </svg>
                  </span>
                  <span className="m-1">Bookmarks</span>
                </div>
              )}
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
          <hr className="my-4" />
          <AuthButton />
        </ul>
      </nav>
    </div>
  );
}
