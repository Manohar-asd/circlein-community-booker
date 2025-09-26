'use client';

import { useEffect, useState } from 'react';

type Params = { date: string; facility?: string; mine?: '0' | '1' };

export function useBookings({ date, facility, mine = '1' }: Params) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true); setError('');
      try {
        const qs = new URLSearchParams({ date, mine });
        if (facility) qs.set('facility', facility);
        const res = await fetch(`/api/bookings/by-day?${qs.toString()}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load bookings');
        if (!cancelled) setData(Array.isArray(json.data) ? json.data : []);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load bookings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (date) run();
    return () => { cancelled = true; };
  }, [date, facility, mine]);

  return { data, loading, error };
}