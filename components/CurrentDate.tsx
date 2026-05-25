import React from 'react';

export default function CurrentDate() {
  const now = new Date();
  const dateString = now.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
  const timeString = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return (
    <div className="text-sm text-slate-300">
      {dateString} {timeString}
    </div>
  );
}
