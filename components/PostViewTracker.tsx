'use client';

import { useEffect } from 'react';

interface PostViewTrackerProps {
  slug: string;
}

export default function PostViewTracker({ slug }: PostViewTrackerProps) {
  useEffect(() => {
    const payload = JSON.stringify({ slug });

    const endpoint = '/api/analytics/view';
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(endpoint, blob);
      return;
    }

    void fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    });
  }, [slug]);

  return null;
}
