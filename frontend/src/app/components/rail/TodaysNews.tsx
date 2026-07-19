'use client';

import { Fragment, useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
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

const DISMISS_KEY = 'todaysNewsDismissedUntil';
const HOUR = 60 * 60 * 1000;

const DISMISS_OPTIONS = [
  { label: 'Dismiss for a day', durationMs: 24 * HOUR },
  { label: 'Dismiss for a week', durationMs: 7 * 24 * HOUR },
  { label: 'Not interested', durationMs: Infinity },
];

function readDismissedUntil(): number {
  if (typeof window === 'undefined') return 0;
  const stored = localStorage.getItem(DISMISS_KEY);
  return stored === 'Infinity' ? Infinity : Number(stored ?? 0);
}

function isDismissed(dismissedUntil: number): boolean {
  return dismissedUntil === Infinity || dismissedUntil > Date.now();
}

function computeDismissedUntil(durationMs: number): number {
  return durationMs === Infinity ? Infinity : Date.now() + durationMs;
}

export default function TodaysNews() {
  const [dismissedUntil, setDismissedUntil] = useState(readDismissedUntil);

  const handleDismiss = (durationMs: number) => {
    const nextDismissedUntil = computeDismissedUntil(durationMs);
    localStorage.setItem(DISMISS_KEY, String(nextDismissedUntil));
    setDismissedUntil(nextDismissedUntil);
  };

  if (isDismissed(dismissedUntil)) {
    return null;
  }

  return (
    <Card
      title="Today's News"
      trailing={
        <Menu as="div" className="relative">
          <Menu.Button
            aria-label="Dismiss"
            className="rounded-full p-1.5 text-muted transition-colors hover:bg-hover hover:text-content"
          >
            <X className="h-5 w-5" />
          </Menu.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 z-10 mt-2 w-64 origin-top-right rounded-2xl border border-border-strong bg-bg p-2 shadow-lg focus:outline-none">
              {DISMISS_OPTIONS.map((option) => (
                <Menu.Item key={option.label}>
                  {({ active }) => (
                    <button
                      type="button"
                      onClick={() => handleDismiss(option.durationMs)}
                      className={`w-full rounded-xl px-3 py-2 text-left text-[15px] text-content ${
                        active ? 'bg-hover' : ''
                      }`}
                    >
                      {option.label}
                    </button>
                  )}
                </Menu.Item>
              ))}
            </Menu.Items>
          </Transition>
        </Menu>
      }
    >
      <ul className="flex flex-col gap-3">
        {NEWS_ITEMS.map((item) => (
          <li key={item.headline}>
            <a
              href="#"
              className="flex items-start gap-3 post-hover -mx-2 rounded-xl p-2"
            >
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
