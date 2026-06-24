'use client';

import { useEffect, useState } from 'react';

export function NotificationBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    fetch('/api/notifications?page=1')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data && typeof data.total === 'number') {
          setCount(data.total);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (count === 0) {
    return (
      <a href="/notifications" className="text-gray-600 hover:underline">
        通知
      </a>
    );
  }

  return (
    <a
      href="/notifications"
      className="relative text-gray-600 hover:underline"
      data-notification-count={count}
    >
      通知
      <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white">
        {count > 99 ? '99+' : count}
      </span>
    </a>
  );
}
