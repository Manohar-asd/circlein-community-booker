import { db } from './firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  getDocs,
  doc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import type { Amenity, Booking } from './types';

// Helper to format local YYYY-MM-DD
function formatLocalYYYYMMDD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Coerce values into a Timestamp-like or Date so Dashboard's formatTime won't crash
function toTimestampLike(dateStr: string | undefined, val: any): Timestamp | Date {
  // If it's already a Firestore Timestamp, keep it
  if (val && typeof val === 'object' && typeof val.toDate === 'function') {
    return val as Timestamp;
  }
  // If backend stored ISO/date string or number, convert to Date
  if (typeof val === 'string' || typeof val === 'number') {
    const parsed = Date.parse(String(val));
    if (!Number.isNaN(parsed)) return new Date(parsed);
  }
  // If backend only kept "HH:MM", create a Date from dateStr + time
  if (typeof val === 'string' && dateStr && /^\d{1,2}:\d{2}(?:\s*[AP]M)?$/i.test(val)) {
    const hm = val.trim();
    // normalize to 24h
    const m = hm.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i)!;
    let h = parseInt(m[1], 10);
    const mins = parseInt(m[2], 10);
    const ap = m[3]?.toUpperCase();
    if (ap === 'PM' && h < 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return new Date(`${dateStr}T${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`);
  }
  // As a last resort, now
  return new Date();
}

// Real-time bookings for a specific date; adapts fields to UI shape
export function subscribeToBookings(selectedDate: Date, cb: (bookings: Booking[]) => void): Unsubscribe {
  const dateStr = formatLocalYYYYMMDD(selectedDate);
  const q = query(collection(db, 'bookings'), where('date', '==', dateStr));

  const unsub = onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => {
      const data = d.data() as any;

      const amenityId = data.amenityId ?? data.facility ?? '';
      const start = data.startTime ?? data.startAt ?? data.startHM ?? '';
      const end = data.endTime ?? data.endAt ?? data.endHM ?? '';

      // Ensure Dashboard receives Timestamp or Date, never "HH:MM" strings
      const startTime = toTimestampLike(data.date, start);
      const endTime = toTimestampLike(data.date, end);

      const booking: any = {
        id: d.id,
        amenityId,
        startTime,
        endTime,
        status: data.status ?? 'confirmed',
        waitlist: data.waitlist ?? [],
        userId: data.userId ?? '',
        // keep other fields if needed by other parts of the app
        date: data.date,
        timeSlot: data.timeSlot,
      };

      return booking as Booking;
    });

    // Sort client-side by start time
    rows.sort((a: any, b: any) => {
      const aMs = a.startTime instanceof Date ? a.startTime.getTime() : a.startTime.toDate().getTime();
      const bMs = b.startTime instanceof Date ? b.startTime.getTime() : b.startTime.toDate().getTime();
      return aMs - bMs;
    });

    cb(rows);
  });

  return unsub;
}

// Keep your existing getAmenities. If missing, you can use a simple version:
export async function getAmenities(): Promise<Amenity[]> {
  // ...existing code (leave as-is)...
  // If you need a minimal fallback:
  // const snap = await getDocs(collection(db, 'amenities'));
  // return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Amenity[];
  return (await (async () => {
    const snap = await getDocs(collection(db, 'amenities'));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Amenity[];
  })());
}