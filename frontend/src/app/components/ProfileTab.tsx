import { signIn, signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";

function ProfileTab() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
  
    return (
      <div className="flex flex-row justify-center rounded m-3 ml-0 overflow-hidden shadow-lg">
        {session ? (
          <div className="h-20">
            <div className="flex flex-row items-center">
              {loading && (
                <div className="spinner">
                  <div className="w-10 h-10 border-4 border-t-blue-500 border-gray-300 rounded-full animate-spin"></div>
                </div>
              )}
              <button
                className="flex justify-around rounded-full p-3 text-white hover:bg-gray-900  transition delay-50 text-left"
                onClick={() => signOut()}
              >
                {/* <Link href="/posts"> */}
                <img
                  className="w-10 h-10 rounded-full"
                  src={session.user?.image ?? "https://via.placeholder.com/150"}
                  onLoad={() => setLoading(false)}
                  onError={() => setLoading(false)}
                />
                <div className="mx-2 text-center items-center">
                  <span className="font-bold text-sm mr-2">
                    {session.user?.name}
                  </span>
                </div>
                <span className="flex mt-1">
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
                      strokeLinecap="round"
                      strokeWidth="2"
                      d="M6 12h.01m6 0h.01m5.99 0h.01"
                    />
                  </svg>
                </span>
              </button>
              {/* </Link> */}
            </div>
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
                    strokeLinecap="round"
                    strokeWidth="2"
                    d="M6 12h.01m6 0h.01m5.99 0h.01"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  export default ProfileTab;