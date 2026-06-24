'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function MarkReadButton({ notificationId }: { notificationId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onRead() {
    setBusy(true);
    const res = await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'POST',
    });
    setBusy(false);
    if (res.ok) {
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={onRead}
      disabled={busy}
      className="text-xs text-gray-500 hover:underline disabled:opacity-50"
    >
      {busy ? '処理中...' : '既読にする'}
    </button>
  );
}
