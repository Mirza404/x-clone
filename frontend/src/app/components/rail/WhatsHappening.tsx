import { MoreHorizontal } from 'lucide-react';
import Card from '../ui/Card';

const TRENDS = [
  { context: 'Technology · Trending', title: '#OpenSource' },
  { context: 'Trending in Business', title: 'Quarterly Earnings' },
  { context: 'Music · Trending', title: 'New Album Release' },
  { context: 'Trending', title: 'Web Development' },
];

export default function WhatsHappening() {
  return (
    <Card title="What's happening">
      <ul className="flex flex-col">
        {TRENDS.map((trend) => (
          <li key={trend.title}>
            <a
              href="#"
              className="post-hover -mx-4 flex items-center justify-between gap-2 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-[13px] text-muted">{trend.context}</p>
                <p className="truncate text-[15px] font-bold text-content">
                  {trend.title}
                </p>
              </div>
              <MoreHorizontal className="h-5 w-5 flex-shrink-0 text-muted" />
            </a>
          </li>
        ))}
      </ul>
      <a href="#" className="mt-1 block text-[15px] text-primary hover:underline">
        Show more
      </a>
    </Card>
  );
}
