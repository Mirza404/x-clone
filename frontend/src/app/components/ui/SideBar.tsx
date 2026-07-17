import Link from 'next/link';
import { Search } from 'lucide-react';

const SideBar = () => {
  return (
    <div className="sticky top-0 flex h-screen flex-col gap-4 py-1">
      {/* Search Box */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-x-text-secondary" />
        <input
          type="text"
          placeholder="Search"
          className="w-full rounded-full border border-transparent bg-x-surface py-3 pl-12 pr-4 text-x-text placeholder-x-text-secondary outline-none focus:border-x-blue focus:bg-x-black"
        />
      </div>

      {/* Subscribe Box */}
      <div className="flex flex-col rounded-2xl border border-x-border p-4 text-x-text">
        <h2 className="text-xl font-bold">Subscribe To Premium</h2>
        <p className="my-2 text-[15px] text-x-text-secondary">
          Subscribe to unlock new features and if eligible, receive a share of
          revenue.
        </p>
        <button className="w-fit rounded-full bg-x-blue px-4 py-2 text-[15px] font-bold text-white transition-colors hover:bg-x-blue-hover">
          Subscribe
        </button>
      </div>

      <footer className="flex flex-wrap text-[13px] text-x-text-secondary">
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
        <span className="m-1">
          Developed by{' '}
          <Link href="/posts" className="hover:underline">
            Mirza Abdulahović
          </Link>
        </span>
      </footer>
    </div>
  );
};

export default SideBar;
