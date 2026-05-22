/* app/components/CurrentDate.tsx */
'use client';
import { useEffect, useState } from 'react';

export default function CurrentDate() {
  const [now, setNow] = useState(new Date());

  // Update the date every minute to keep it fairly fresh without re‑rendering constantly
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return <>{now.toLocaleDateString('pt-BR')}</>;
}
