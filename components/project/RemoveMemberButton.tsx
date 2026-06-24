'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RemoveMemberButton({
  projectId,
  userId,
  label,
  disabled = false,
}: {
  projectId: number;
  userId: number;
  label: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onRemove() {
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/members/${userId}`, {
      method: 'DELETE',
    });
    setBusy(false);
    if (res.ok) {
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={onRemove}
      disabled={disabled || busy}
      className="text-xs text-red-600 hover:underline disabled:opacity-50"
    >
      {busy ? '削除中...' : label}
    </button>
  );
}
