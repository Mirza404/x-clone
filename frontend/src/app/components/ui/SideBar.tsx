import Link from 'next/link';
import { Search } from 'lucide-react';
import Card from './Card';
import TodaysNews from '../rail/TodaysNews';
import WhatsHappening from '../rail/WhatsHappening';

const SideBar = () => {
  return (
    <div className="sticky top-0 flex h-screen flex-col gap-4 overflow-y-auto py-1">
      {/* Search Box */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          type="text"
          placeholder="Search"
          className="w-full rounded-full border border-transparent bg-input py-3 pl-12 pr-4 text-content placeholder-muted outline-none focus:border-border-strong focus:bg-bg"
        />
      </div>

      {/* Subscribe Box */}
      <Card title="Subscribe to Premium">
        <p className="mb-3 text-[15px] text-muted">
          Get rid of ads, see your analytics, boost your replies and unlock
          20+ features.
        </p>
        <button className="w-fit rounded-full bg-primary px-4 py-2 text-[15px] font-bold text-white transition-colors hover:bg-primary-hover">
          Subscribe
        </button>
      </Card>

      <TodaysNews />
      <WhatsHappening />

      <footer className="flex flex-wrap text-[13px] text-muted">
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
