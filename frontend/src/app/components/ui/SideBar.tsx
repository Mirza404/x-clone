import React from 'react';
import Link from 'next/link';

const SideBar = () => {
  return (
    <div className="fixed top-0">
      <div className="flex flex-col items-center justify-center rounded overflow-hidden shadow-lg mx-7 mt-0 p-0 w-[22.75rem]">
        {/* Search Box */}
        <div className="bg-black text-white rounded-full p-4 w-[105%] mt-1 pt-0">
          <div className="relative text-base w-full h-[110%]">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white"
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
                strokeWidth="2"
                d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search"
              className="w-full p-2 pl-8 rounded-full bg-black border border-gray-700"
            />
          </div>
        </div>
        {/* Subscribe Box */}
        <div className="flex flex-col p-4 border border-gray-700 rounded-2xl shadow-md bg-black m-0 mb-4 max-w-[21.75rem] h-30 text-white">
          <h2 className="text-xl font-bold my-0">Subscribe To Premium</h2>
          <p className="text-sm p-auto my-2">
            Subscribe to unlock new features and if eligible, receive a share of
            revenue.
          </p>
          <button className="flex items-center text-center bg-blue-500 text-sm px-5 my-0 rounded-full w-28 h-9">
            <b>Subscribe</b>
          </button>
          {/* Add subscribe content here */}
        </div>
        <footer className="flex flex-wrap justify-center text-sm text-gray-500 ">
          <Link href="/posts" className="m-1 hover:underline">
            Terms of Service
          </Link>
          <Link href="/posts" className="m-1 hover:underline">
            Privacy Policy
          </Link>
          <Link href="/posts" className="m-1 hover:underline">
            Cookie Policy
          </Link>
          <Link href="/posts" className="m-1 hover:underline">
            Accessibility
          </Link>
          <Link href="/posts" className="m-1 hover:underline">
            Ads info
          </Link>
          <Link href="/posts" className="m-1 hover:underline">
            More
          </Link>
          <Link href="/posts" className="m-1 hover:underline">
            © 2025 X Corp.
          </Link>
          <span className="m-1 ">
            Developed by{' '}
            <Link href="/posts" className="hover:underline">
              Mirza Abdulahović
            </Link>
          </span>
        </footer>
      </div>
    </div>
  );
};

export default SideBar;
