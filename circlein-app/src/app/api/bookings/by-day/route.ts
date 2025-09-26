import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

function parseHMToMinutes(hm?: any): number {
  if (typeof hm !== 'string') return Number.POSITIVE_INFINITY;
  const m = hm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return Number.POSITIVE_INFINITY;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId =
    (session?.user as any)?.id ||
    (session?.user as any)?.uid ||
    (session as any)?.userId ||
    (session as any)?.sub ||
    session?.user?.email ||
    null;

  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const facility = searchParams.get('facility');
  const mine = searchParams.get('mine') ?? '1';

  if (!date) {
    return NextResponse.json({ success: false, error: 'Missing date' }, { status: 400 });
  }

  try {
    const base = collection(db, 'bookings');
    const filters = [where('date', '==', date)];
    if (mine !== '0') filters.push(where('userId', '==', userId));
    if (facility) filters.push(where('facility', '==', facility));

    // Try server-side order (requires composite index)
    let items: any[] = [];
    try {
      const q = query(base, ...filters, orderBy('startTime'));
      const snap = await getDocs(q);
      items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e: any) {
      // Fallback if an index is missing: drop orderBy and sort in memory
      if (e?.code === 'failed-precondition') {
        const q = query(base, ...filters);
        const snap = await getDocs(q);
        items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        items.sort((a, b) => parseHMToMinutes(a.startTime) - parseHMToMinutes(b.startTime));
      } else {
        throw e;
      }
    }

    return NextResponse.json({ success: true, data: items });
  } catch (e) {
    console.error('bookings/by-day error:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}