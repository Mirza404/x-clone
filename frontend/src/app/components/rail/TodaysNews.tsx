import { X } from 'lucide-react';
import Card from '../ui/Card';

const NEWS_ITEMS = [
  {
    headline: 'Local team clinches division title in dramatic finish',
    meta: '2 days ago · Sports · 34.9K posts',
  },
  {
    headline: 'New transit line opens ahead of schedule',
    meta: '5 hours ago · News · 12.3K posts',
  },
  {
    headline: 'Tech conference announces record attendance',
    meta: '1 day ago · Technology · 8,410 posts',
  },
];

export default function TodaysNews() {
  return (
    <Card
      title="Today's News"
      trailing={
        <button
          type="button"
          onClick={() => {}}
          aria-label="Dismiss"
          className="rounded-full p-1.5 text-muted transition-colors hover:bg-hover hover:text-content"
        >
          <X className="h-5 w-5" />
        </button>
      }
    >
      <ul className="flex flex-col gap-3">
        {NEWS_ITEMS.map((item) => (
          <li key={item.headline}>
            <a href="#" className="flex items-start gap-3 post-hover -mx-2 rounded-xl p-2">
              <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-input" />
              <div className="min-w-0">
                <p className="line-clamp-2 text-[15px] font-bold text-content">
                  {item.headline}
                </p>
                <p className="mt-0.5 text-[13px] text-muted">{item.meta}</p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}
