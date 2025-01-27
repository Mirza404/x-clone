"use client";
import Link from "next/link";
import ProfileTab from "./ProfileTab";
import { usePathname } from "next/navigation";

export default function NavMenu() {
  const pathname = usePathname();
  return (
    <div>
      <nav className="mt-0 m-5 px-2">
        <ul className="flex flex-col">
          <Link href="/posts">
            <button className="flex items-center rounded-full py-1 px-2 text-white hover:text-gray-300 hover:bg-gray-900 transition delay-50 text-left my-2">
              <span className="flex items-center m-1">
                <svg
                  className="w-8 h-8 text-gray-800 dark:text-white"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M13.795 10.533 20.68 2h-3.073l-5.255 6.517L7.69 2H1l7.806 10.91L1.47 22h3.074l5.705-7.07L15.31 22H22l-8.205-11.467Zm-2.38 2.95L9.97 11.464 4.36 3.627h2.31l4.528 6.317 1.443 2.02 6.018 8.409h-2.31l-4.934-6.89Z" />
                </svg>
              </span>
            </button>
          </Link>
          <Link href="/posts">
            <li
              className={`flex items-center rounded-full py-1 px-2 text-white hover:text-gray-300 hover:bg-gray-900 transition delay-50 text-left mr-0 my-1 w-fit ${
                pathname === "/posts" ? "font-bold" : ""
              }`}
            >
              {pathname === "/posts" ? (
                <div className="flex">
                  <span className="flex items-center m-1 mr-3">
                    <svg
                      className="w-8 h-8 text-gray-800 dark:text-white"
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
                  <span className="flex items-center m-1 text-xl mr-5">
                    Home
                  </span>
                </div>
              ) : (
                <div className="flex">
                  <span className="flex items-center m-1 mr-3">
                    <svg
                      className="w-8 h-8 text-gray-800 dark:text-white"
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
                  <span className="flex items-center m-1 text-xl mr-5">
                    Home
                  </span>
                </div>
              )}
            </li>
          </Link>
          {/* EXPLORE BUTTON */}
          <Link href="/explore">
            <li
              className={`flex items-center rounded-full py-1 px-2 text-white hover:text-gray-300 hover:bg-gray-900 transition delay-50 text-left my-2 w-fit ${
                pathname === "/explore" ? "font-bold" : ""
              }`}
            >
              {pathname === "/explore" ? (
                <div className="flex">
                  <span className="flex items-center m-1 mr-3">
                    <svg
                      className="w-8 h-8 text-gray-800 dark:text-white"
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
                  <span className="flex items-center m-1 text-xl">Explore</span>
                </div>
              ) : (
                <div className="flex">
                  <span className="flex items-center m-1 mr-3">
                    <svg
                      className="w-8 h-8 text-gray-800 dark:text-white"
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
                  <span className="flex items-center m-1 text-xl">Explore</span>
                </div>
              )}
            </li>
          </Link>
          <Link href="/notifications">
            <li
              className={`flex items-center rounded-full py-1 px-2 text-white hover:text-gray-300 hover:bg-gray-900 transition delay-50 text-left my-2 w-fit ${
                pathname === "/notifications" ? "font-bold" : ""
              }`}
            >
              {pathname === "/notifications" ? (
                <div className="flex">
                  <span className="flex items-center m-1 mr-3">
                    <svg
                      className="w-8 h-8 text-gray-800 dark:text-white"
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
                  <span className="flex items-center m-1 text-xl">
                    Notifications
                  </span>
                </div>
              ) : (
                <div className="flex">
                  <span className="flex items-center m-1 mr-3">
                    <svg
                      className="w-8 h-8 text-gray-800 dark:text-white"
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
                  <span className="flex items-center m-1 text-xl">
                    Notifications
                  </span>
                </div>
              )}
            </li>
          </Link>
          <Link href="/messages">
            <li
              className={`flex items-center rounded-full py-1 px-2 text-white hover:text-gray-300 hover:bg-gray-900 transition delay-50 text-left my-2 w-fit ${
                pathname === "/messages" ? "font-bold" : ""
              }`}
            >
              {pathname === "/messages" ? (
                <div className="flex">
                  <span className="flex items-center m-1 mr-3">
                    <svg
                      className="w-8 h-8 text-gray-800 dark:text-white"
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
                  <span className="flex items-center m-1 text-xl">
                    Messages
                  </span>
                </div>
              ) : (
                <div className="flex">
                  <span className="flex items-center m-1 mr-3">
                    <svg
                      className="w-8 h-8 text-gray-800 dark:text-white"
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
                  <span className="flex items-center m-1 text-xl">
                    Messages
                  </span>
                </div>
              )}
            </li>
          </Link>
          <Link href="/bookmarks">
            <li
              className={`flex items-center rounded-full py-1 px-2 text-white hover:text-gray-300 hover:bg-gray-900 transition delay-50 text-left my-2 w-fit ${
                pathname === "/bookmarks" ? "font-bold" : ""
              }`}
            >
              {pathname === "/bookmarks" ? (
                <div className="flex">
                  <span className="flex items-center m-1 mr-3">
                    <svg
                      className="w-8 h-8 text-gray-800 dark:text-white"
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
                  <span className="flex items-center m-1 text-xl">
                    Bookmarks
                  </span>
                </div>
              ) : (
                <div className="flex">
                  <span className="flex items-center m-1 mr-3">
                    <svg
                      className="w-8 h-8 text-gray-800 dark:text-white"
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
                  <span className="flex items-center m-1 text-xl">
                    Bookmarks
                  </span>
                </div>
              )}
            </li>
          </Link>
          <Link href="/jobs">
            <li
              className={`flex items-center rounded-full py-1 px-2 text-white hover:text-gray-300 hover:bg-gray-900 transition delay-50 text-left my-2 w-fit ${
                pathname === "/jobs" ? "font-bold" : ""
              }`}
            >
              {pathname === "/jobs" ? (
                <div className="flex">
                  <span className="flex items-center m-1 mr-3">
                    <svg
                      className="w-8 h-8 text-gray-800 dark:text-white"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M10 2a3 3 0 0 0-3 3v1H5a3 3 0 0 0-3 3v2.382l1.447.723.005.003.027.013.12.056c.108.05.272.123.486.212.429.177 1.056.416 1.834.655C7.481 13.524 9.63 14 12 14c2.372 0 4.52-.475 6.08-.956.78-.24 1.406-.478 1.835-.655a14.028 14.028 0 0 0 .606-.268l.027-.013.005-.002L22 11.381V9a3 3 0 0 0-3-3h-2V5a3 3 0 0 0-3-3h-4Zm5 4V5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v1h6Zm6.447 7.894.553-.276V19a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-5.382l.553.276.002.002.004.002.013.006.041.02.151.07c.13.06.318.144.557.242.478.198 1.163.46 2.01.72C7.019 15.476 9.37 16 12 16c2.628 0 4.98-.525 6.67-1.044a22.95 22.95 0 0 0 2.01-.72 15.994 15.994 0 0 0 .707-.312l.041-.02.013-.006.004-.002.001-.001-.431-.866.432.865ZM12 10a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2H12Z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </span>
                  <span className="flex items-center m-1 text-xl">Jobs</span>
                </div>
              ) : (
                <div className="flex">
                  <span className="flex items-center m-1 mr-3">
                    <svg
                      className="w-8 h-8 text-gray-800 dark:text-white"
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
                        d="M8 7H5a2 2 0 0 0-2 2v4m5-6h8M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m0 0h3a2 2 0 0 1 2 2v4m0 0v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6m18 0s-4 2-9 2-9-2-9-2m9-2h.01"
                      />
                    </svg>
                  </span>
                  <span className="flex items-center m-1 text-xl">Jobs</span>
                </div>
              )}
            </li>
          </Link>
          <Link href="/communities">
            <li
              className={`flex items-center rounded-full py-1 px-2 text-white hover:text-gray-300 hover:bg-gray-900 transition delay-50 text-left my-2 w-fit ${
                pathname === "/communities" ? "font-bold" : ""
              }`}
            >
              {pathname === "/communities" ? (
                <div className="flex">
                  <span className="flex items-center m-1 mr-3">
                    <svg
                      className="w-8 h-8 text-gray-800 dark:text-white"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M12 6a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm-1.5 8a4 4 0 0 0-4 4 2 2 0 0 0 2 2h7a2 2 0 0 0 2-2 4 4 0 0 0-4-4h-3Zm6.82-3.096a5.51 5.51 0 0 0-2.797-6.293 3.5 3.5 0 1 1 2.796 6.292ZM19.5 18h.5a2 2 0 0 0 2-2 4 4 0 0 0-4-4h-1.1a5.503 5.503 0 0 1-.471.762A5.998 5.998 0 0 1 19.5 18ZM4 7.5a3.5 3.5 0 0 1 5.477-2.889 5.5 5.5 0 0 0-2.796 6.293A3.501 3.501 0 0 1 4 7.5ZM7.1 12H6a4 4 0 0 0-4 4 2 2 0 0 0 2 2h.5a5.998 5.998 0 0 1 3.071-5.238A5.505 5.505 0 0 1 7.1 12Z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </span>
                  <span className="flex items-center m-1 text-xl">
                    Communities
                  </span>
                </div>
              ) : (
                <div className="flex">
                  <span className="flex items-center m-1 mr-3">
                    <svg
                      className="w-8 h-8 text-gray-800 dark:text-white"
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
                        d="M4.5 17H4a1 1 0 0 1-1-1 3 3 0 0 1 3-3h1m0-3.05A2.5 2.5 0 1 1 9 5.5M19.5 17h.5a1 1 0 0 0 1-1 3 3 0 0 0-3-3h-1m0-3.05a2.5 2.5 0 1 0-2-4.45m.5 13.5h-7a1 1 0 0 1-1-1 3 3 0 0 1 3-3h3a3 3 0 0 1 3 3 1 1 0 0 1-1 1Zm-1-9.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z"
                      />
                    </svg>
                  </span>
                  <span className="flex items-center m-1 text-xl">
                    Communities
                  </span>
                </div>
              )}
            </li>
          </Link>
          <Link href="/premium">
            <li
              className={`flex items-center rounded-full py-1 px-2 text-white hover:text-gray-300 hover:bg-gray-900 transition delay-50 text-left my-2 w-fit ${
                pathname === "/premium" ? "font-bold" : ""
              }`}
            >
              {pathname === "/premium" ? (
                <div className="flex">
                  <span className="flex items-center m-1 mr-3">
                    <svg
                      className="w-8 h-8 text-gray-800 dark:text-white"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M13.795 10.533 20.68 2h-3.073l-5.255 6.517L7.69 2H1l7.806 10.91L1.47 22h3.074l5.705-7.07L15.31 22H22l-8.205-11.467Zm-2.38 2.95L9.97 11.464 4.36 3.627h2.31l4.528 6.317 1.443 2.02 6.018 8.409h-2.31l-4.934-6.89Z" />
                    </svg>
                  </span>
                  <span className="flex items-center m-1 text-xl">Premium</span>
                </div>
              ) : (
                <div className="flex">
                  <span className="flex items-center m-1 mr-3">
                    <svg
                      className="w-8 h-8 text-gray-800 dark:text-white"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M13.795 10.533 20.68 2h-3.073l-5.255 6.517L7.69 2H1l7.806 10.91L1.47 22h3.074l5.705-7.07L15.31 22H22l-8.205-11.467Zm-2.38 2.95L9.97 11.464 4.36 3.627h2.31l4.528 6.317 1.443 2.02 6.018 8.409h-2.31l-4.934-6.89Z" />
                    </svg>
                  </span>
                  <span className="flex items-center m-1 text-xl">Premium</span>
                </div>
              )}
            </li>
          </Link>
          <Link href="/verifiedorgs">
            <li
              className={`flex items-center rounded-full py-1 px-2 text-white hover:text-gray-300 hover:bg-gray-900 transition delay-50 text-left my-2 w-fit ${
                pathname === "/verifiedorgs" ? "font-bold" : ""
              }`}
            >
              {pathname === "/verifiedorgs" ? (
                <div className="flex">
                  <span className="flex items-center m-1 mr-3">
                    <svg
                      viewBox="0 0 16 16"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="#ffffff"
                      className="bi bi-lightning-fill w-8 h-8 text-gray-800 dark:text-white"
                    >
                      <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                      <g
                        id="SVGRepo_tracerCarrier"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      ></g>
                      <g id="SVGRepo_iconCarrier">
                        <path d="M5.52.359A.5.5 0 0 1 6 0h4a.5.5 0 0 1 .474.658L8.694 6H12.5a.5.5 0 0 1 .395.807l-7 9a.5.5 0 0 1-.873-.454L6.823 9.5H3.5a.5.5 0 0 1-.48-.641l2.5-8.5z"></path>
                      </g>
                    </svg>
                  </span>
                  <span className="flex items-center m-1 text-xl">
                    Verified Orgs
                  </span>
                </div>
              ) : (
                <div className="flex">
                  <span className="flex items-center m-1 mr-3">
                    <svg
                      viewBox="0 0 16 16"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="#ffffff"
                      className="bi bi-lightning-fill w-8 h-8 text-gray-800 dark:text-white"
                    >
                      <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                      <g
                        id="SVGRepo_tracerCarrier"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      ></g>
                      <g id="SVGRepo_iconCarrier">
                        <path d="M5.52.359A.5.5 0 0 1 6 0h4a.5.5 0 0 1 .474.658L8.694 6H12.5a.5.5 0 0 1 .395.807l-7 9a.5.5 0 0 1-.873-.454L6.823 9.5H3.5a.5.5 0 0 1-.48-.641l2.5-8.5z"></path>
                      </g>
                    </svg>
                  </span>
                  <span className="flex items-center m-1 text-xl">
                    Verified Orgs
                  </span>
                </div>
              )}
            </li>
          </Link>
          <Link href="/profile">
            <li
              className={`flex items-center rounded-full py-1 px-2 text-white hover:text-gray-300 hover:bg-gray-900 transition delay-50 text-left my-2 w-fit ${
                pathname === "/profile" ? "font-bold" : ""
              }`}
            >
              {pathname === "/profile" ? (
                <div className="flex">
                  <span className="flex items-center ml-0 m-1 mr-3">
                    <svg
                      className="w-9 h-9 text-gray-800 dark:text-white"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2 9a4 4 0 0 0-4 4v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1a4 4 0 0 0-4-4h-4Z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </span>
                  <span className="flex items-center m-1 text-xl">Profile</span>
                </div>
              ) : (
                <div className="flex">
                  <span className="flex items-center ml-0 m-1 mr-3">
                    <svg
                      className="w-9 h-9 text-gray-800 dark:text-white"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke="currentColor"
                        strokeWidth="2"
                        d="M7 17v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1a3 3 0 0 0-3-3h-4a3 3 0 0 0-3 3Zm8-9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                      />
                    </svg>
                  </span>
                  <span className="flex items-center m-1 text-xl">Profile</span>
                </div>
              )}
            </li>
          </Link>
          <Link href="/posts">
            <li className="flex items-center rounded-full py-1 px-2 text-white hover:text-gray-300 hover:bg-gray-900 transition delay-50 text-left my-2 pointer-events-none w-fit">
              <div className="flex">
                <span className="flex items-center ml-1 m-1 mr-3">
                  <svg
                    className="w-8 h-8 text-gray-800 dark:text-white"
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
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9.529 9.988a2.502 2.502 0 1 1 5 .191A2.441 2.441 0 0 1 12 12.582V14m-.01 3.008H12M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                </span>
                <span className="flex items-center m-1 text-xl">More</span>
              </div>
            </li>
          </Link>
          <div className="flex justify-center items-center text-center rounded-full bg-white text-black hover:bg-gray-300 transition duration-300 w-[250px] h-[58px] my-3">
            <Link
              href="/newPost"
              className="mt-4 w-full pb-3  transition duration-300 text-lg font-bold"
            >
              Post
            </Link>
          </div>
        </ul>
      </nav>
      <div className="absolute w-[13em] m-0">
        <ProfileTab />
      </div>
    </div>
  );
}
