import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';

interface ApiResponse {
  success: boolean;
  error?: string;
  data?: any;
}

const DEBUG = process.env.NODE_ENV === 'development';

// Shallow + nested lookup for a string value
function getFirstString(source: any, keys: string[]): string {
  if (!source || typeof source !== 'object') return '';
  for (const k of keys) {
    const v = (source as any)[k];
    if (typeof v === 'string') return v.trim();
    if (v != null && (typeof v === 'number' || typeof v === 'boolean')) return String(v).trim();
  }
  // Search one level deep
  for (const [, v] of Object.entries(source)) {
    if (v && typeof v === 'object') {
      const found = getFirstString(v, keys);
      if (found) return found;
    }
  }
  return '';
}

// Decide how to read the body based on Content-Type
async function parseBody(request: NextRequest): Promise<Record<string, any> | null> {
  const ct = request.headers.get('content-type')?.toLowerCase() || '';
  if (ct.includes('application/json')) {
    try {
      return await request.json();
    } catch {
      return null;
    }
  }
  if (ct.includes('form')) {
    try {
      const form = await request.formData();
      return Object.fromEntries(form.entries());
    } catch {
      return null;
    }
  }
  // Fallback: try JSON (some clients omit content-type)
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function fmtHMFromISO(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function coerceBody(input: any) {
  if (!input || typeof input !== 'object') {
    return { facility: '', facilityName: '', date: '', timeSlot: '' };
  }

  const facility = getFirstString(input, ['facility', 'facilityId', 'amenityId', 'room', 'resource', 'id']);
  const facilityName = getFirstString(input, ['facilityName', 'amenityName', 'facilityLabel', 'name', 'title']);
  let date = getFirstString(input, ['date', 'bookingDate', 'selectedDate']);
  let timeSlot = getFirstString(input, ['timeSlot', 'slot', 'selectedSlot']);

  const startISO = getFirstString(input, ['startTime', 'start', 'startISO']);
  const endISO = getFirstString(input, ['endTime', 'end', 'endISO']);

  if (!date && startISO) {
    date = new Date(startISO).toISOString().slice(0, 10);
  }
  if (!timeSlot && startISO && endISO) {
    timeSlot = `${fmtHMFromISO(startISO)} - ${fmtHMFromISO(endISO)}`;
  }

  return { facility, facilityName, date, timeSlot };
}

function parseHMTo24(hm: string) {
  const m = hm.trim().match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const mins = parseInt(m[2], 10);
  const ap = m[3]?.toUpperCase();
  if (ap) {
    if (ap === 'PM' && h < 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
  }
  if (h < 0 || h > 23 || mins < 0 || mins > 59) return null;
  return `${String(h).padStart(2,'0')}:${String(mins).padStart(2,'0')}`;
}

export async function POST(request: NextRequest) {
  try {
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

    const parsed = await parseBody(request);
    const { facility, facilityName, date, timeSlot } = coerceBody(parsed);

    if (DEBUG) {
      console.log('[bookings/create] values:', { facility, facilityName, date, timeSlot });
    }

    const missing: string[] = [];
    if (!facility) missing.push('facility');
    if (!date) missing.push('date');
    if (!timeSlot) missing.push('timeSlot');
    if (missing.length) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: `Missing required fields: ${missing.join(', ')}`, data: DEBUG ? parsed ?? {} : undefined },
        { status: 400 }
      );
    }

    const maxDays = Number(process.env.MAX_BOOKING_DAYS_AHEAD ?? 7);
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const maxDate = new Date(startOfToday);
    maxDate.setDate(maxDate.getDate() + maxDays);

    const dateObj = new Date(`${date}T00:00:00`);
    if (Number.isNaN(dateObj.getTime())) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Invalid date format (expected YYYY-MM-DD)' }, { status: 400 });
    }
    if (dateObj < startOfToday || dateObj > maxDate) {
      return NextResponse.json<ApiResponse>({ success: false, error: `Date must be within ${maxDays} days` }, { status: 400 });
    }

    // Derive normalized times
    const [, startRaw, endRaw] = timeSlot.match(/^(.+?)\s*-\s*(.+)$/)!;
    const startHHMM = parseHMTo24(startRaw);
    const endHHMM = parseHMTo24(endRaw);
    if (!startHHMM || !endHHMM) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Invalid time range' }, { status: 400 });
    }
    const startAtDate = new Date(`${date}T${startHHMM}:00`);
    const endAtDate = new Date(`${date}T${endHHMM}:00`);
    if (isNaN(startAtDate.getTime()) || isNaN(endAtDate.getTime()) || endAtDate <= startAtDate) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Invalid start/end time' }, { status: 400 });
    }
    const startTs = Timestamp.fromDate(startAtDate);
    const endTs = Timestamp.fromDate(endAtDate);

    const bookingsRef = collection(db, 'bookings');
    const conflictQuery = query(
      bookingsRef,
      where('facility', '==', facility),
      where('date', '==', date),
      where('timeSlot', '==', timeSlot)
    );
    const conflictDocs = await getDocs(conflictQuery);
    if (!conflictDocs.empty) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Time slot already booked' }, { status: 409 });
    }

    const bookingData = {
      userId,
      userEmail: session?.user?.email,
      userName: session?.user?.name,
      amenityId: facility,
      facility,
      facilityName: facilityName || '',
      date,
      timeSlot,
      startTime: startTs,
      endTime: endTs,
      startAt: startTs,
      endAt: endTs,
      status: 'confirmed',
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(bookingsRef, bookingData);
    return NextResponse.json({ success: true, data: { id: docRef.id, ...bookingData } });
  } catch (err) {
    console.error('Booking creation error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// Remove any top-level fetch() calls from this file. This is a server route, not client code.