import React from "react";


// font-size: 0.875rem /* 14px */;
//     line-height: 1.25rem /* 20px */;
// }
const SideBar = () => {
  return (
    <div className="flex flex-col items-center justify-center rounded overflow-hidden shadow-lg mx-7 mt-0 p-0 w-96">
      <div className="bg-black text-white rounded-full p-4 w-full mt-1 pt-0">
        <div className="relative text-base w-full h-[110%]">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-950 dark:text-white"
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
      <div className="flex flex-col p-4 border border-gray-700 rounded-2xl shadow-md bg-black m-0 max-w-[22rem] h-30">
        <h2 className="text-xl font-bold">Subscribe To Premium</h2>
        <p className="text-sm p-auto">
          Subscribe to unlock new features and if eligible, receive a share of
          revenue.
        </p>
        <button className="flex items-center bg-blue-500 text-white text-sm p-3 my-2 rounded-full w-24 h-8">
          <b>Subscribe</b>
        </button>
        {/* Add subscribe content here */}
      </div>
      <div className="bg-black text-white rounded p-4">
        <h2 className="text-xl font-bold">What's happening</h2>
        {/* Add what's happening content here */}
      </div>
      <div className="bg-black text-white rounded p-4">
        <h2 className="text-xl font-bold">Who to follow</h2>
        {/* Add who to follow content here */}
      </div>
      <footer className="text-gray-500 text-sm">
        <p>Terms of Service</p>
        <p>Privacy Policy</p>
        <p>Cookie Policy</p>
        <p>Accessibility</p>
        <p>Ads info</p>
        <p>More</p>
        <p>© 2025 X Corp.</p>
      </footer>
    </div>
  );
};

export default SideBar;
