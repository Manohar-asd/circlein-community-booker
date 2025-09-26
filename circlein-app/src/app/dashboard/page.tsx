'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getAmenities } from '@/lib/database';
import { Amenity, Booking } from '@/lib/types';
import { SessionUser } from '@/types/next-auth';
import { Calendar as CalendarIcon, LogOut, Plus, Clock, Users, X, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

// Firestore Timestamp-like guard
function isFsTimestamp(v: any): v is { toDate: () => Date } {
  return typeof v === 'object' && v !== null && typeof (v as any).toDate === 'function';
}

// Format to local YYYY-MM-DD without timezone shift
function formatLocalYYYYMMDD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Robust time formatter: accepts Firestore Timestamp, Date, number, ISO, or "HH:MM[/ AM|PM]"
function formatTime(input: any): string {
  if (!input) return '';
  if (typeof input === 'string') {
    // If it's already "HH:MM" or "HH:MM AM/PM", just show it
    const m = input.trim().match(/^\d{1,2}:\d{2}(?:\s*[AP]M)?$/i);
    if (m) return input;
    const parsed = Date.parse(input);
    if (!Number.isNaN(parsed)) return format(new Date(parsed), 'HH:mm');
    return input;
  }
  let date: Date | null = null;
  if (isFsTimestamp(input)) date = input.toDate();
  else if (input instanceof Date) date = input;
  else if (typeof input === 'number') date = new Date(input);
  else if (typeof input === 'object' && input && 'seconds' in input && 'nanoseconds' in input) {
    // Firestore Timestamp serialized to JSON
    const ms = (input as any).seconds * 1000 + Math.floor((input as any).nanoseconds / 1e6);
    date = new Date(ms);
  }
  return date ? format(date, 'HH:mm') : '';
}

// Build an absolute start Date from booking fields for comparisons
function getBookingStartDate(b: any): Date | null {
  if (typeof b?.date === 'string' && typeof b?.startTime === 'string') {
    const d = new Date(`${b.date}T${b.startTime}:00`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const t = b?.startAt ?? b?.startTime;
  if (isFsTimestamp(t)) return t.toDate();
  if (t instanceof Date) return t;
  if (typeof t === 'string') {
    const parsed = Date.parse(t);
    if (!Number.isNaN(parsed)) return new Date(parsed);
  }
  if (typeof t === 'object' && t && 'seconds' in t && 'nanoseconds' in t) {
    const ms = (t as any).seconds * 1000 + Math.floor((t as any).nanoseconds / 1e6);
    return new Date(ms);
  }
  return null;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load amenities and auth gate
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/');
      return;
    }
    const loadAmenities = async () => {
      try {
        const amenitiesData = await getAmenities();
        setAmenities(amenitiesData);
      } catch (e) {
        console.error('Error loading amenities:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadAmenities();
  }, [session, status, router]);

  // Fetch bookings (server API) for selected date
  useEffect(() => {
    if (!session) return;
    const dateStr = formatLocalYYYYMMDD(selectedDate);
    let cancelled = false;
    async function run() {
      setError('');
      try {
        // mine=0 shows all bookings; use mine=1 to show only the current user's
        const params = new URLSearchParams({ date: dateStr, mine: '0' });
        const res = await fetch(`/api/bookings/by-day?${params.toString()}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load bookings');

        // Adapt API data to the Booking shape this UI expects
        const adapted: Booking[] = (json.data || []).map((it: any) => {
          const bk: any = {
            id: it.id,
            // original UI expects amenityId; we store "facility" (amenity id)
            amenityId: it.amenityId ?? it.facility ?? '',
            // Prefer normalized strings; formatTime handles both string and Timestamp-like
            startTime: it.startTime ?? it.startAt ?? '',
            endTime: it.endTime ?? it.endAt ?? '',
            status: it.status ?? 'confirmed',
            waitlist: it.waitlist ?? [],
            userId: it.userId ?? '',
            // Keep date and label fields if present (helpful for comparisons)
            date: it.date,
            timeSlot: it.timeSlot,
            startAt: it.startAt,
            endAt: it.endAt,
          };
          return bk as Booking;
        });

        if (!cancelled) setBookings(adapted);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load bookings');
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, session]);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  const handleCancelBooking = async (bookingId: string) => {
    setIsCancelling(bookingId);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.data.message);
        // Refetch bookings for the current date
        const dateStr = formatLocalYYYYMMDD(selectedDate);
        const params = new URLSearchParams({ date: dateStr, mine: '0' });
        const res = await fetch(`/api/bookings/by-day?${params.toString()}`, { cache: 'no-store' });
        const json = await res.json();
        if (res.ok && json.success) {
          const adapted: Booking[] = (json.data || []).map((it: any) => ({
            id: it.id,
            amenityId: it.amenityId ?? it.facility ?? '',
            startTime: it.startTime ?? it.startAt ?? '',
            endTime: it.endTime ?? it.endAt ?? '',
            status: it.status ?? 'confirmed',
            waitlist: it.waitlist ?? [],
            userId: it.userId ?? '',
            date: it.date,
            timeSlot: it.timeSlot,
            startAt: it.startAt,
            endAt: it.endAt,
          })) as Booking[];
          setBookings(adapted);
        }
      } else {
        setError(data.error || 'Failed to cancel booking');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsCancelling(null);
    }
  };

  const canCancelBooking = (booking: Booking) => {
    const now = new Date();
    const start = getBookingStartDate(booking as any);
    return !!start && start > now && booking.userId === (session?.user as SessionUser)?.id;
  };

  const getAmenityName = (amenityId: string) => {
    const amenity = amenities.find(a => a.id === amenityId);
    return amenity ? amenity.name : 'Unknown Amenity';
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-slate-50 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 dark:border-white mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-slate-50 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div className="flex items-center">
            <CalendarIcon className="h-8 w-8 text-slate-900 dark:text-white mr-3" />
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">CircleIn Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">Welcome, {session.user?.name}</span>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Select a Date</CardTitle>
                <CardDescription>Choose a date to view and manage bookings</CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" onClick={() => router.push('/book')}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Booking
                </Button>
                {session.user?.role === 'admin' && (
                  <Button variant="outline" className="w-full" onClick={() => router.push('/admin')}>
                    Admin Panel
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Selected Date Info */}
            <Card>
              <CardHeader>
                <CardTitle>Selected Date</CardTitle>
                <CardDescription>{format(selectedDate, 'EEEE, MMMM do, yyyy')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{bookings.length} Bookings</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Status Messages */}
        {error && <div className="mt-4 text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">{error}</div>}
        {success && <div className="mt-4 text-green-600 text-sm text-center bg-green-50 p-3 rounded-md">{success}</div>}

        {/* Bookings List */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Bookings for {format(selectedDate, 'MMMM do, yyyy')}</CardTitle>
              <CardDescription>All bookings scheduled for the selected date</CardDescription>
            </CardHeader>
            <CardContent>
              {bookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p>No bookings for this date</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking: Booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 bg-card"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              booking.status === 'confirmed'
                                ? 'bg-blue-100 dark:bg-blue-900/30'
                                : booking.status === 'waitlist'
                                ? 'bg-yellow-100 dark:bg-yellow-900/30'
                                : 'bg-gray-100 dark:bg-gray-800'
                            }`}
                          >
                            {booking.status === 'waitlist' ? (
                              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                            ) : (
                              <Clock className="h-5 w-5 text-slate-900 dark:text-white" />
                            )}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-white">{getAmenityName((booking as any).amenityId)}</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatTime((booking as any).startTime)} - {formatTime((booking as any).endTime)}
                          </p>
                          {booking.userId === (session?.user as SessionUser)?.id && (
                            <p className="text-xs text-slate-900 dark:text-white">Your booking</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            booking.status === 'confirmed' ? 'default' : booking.status === 'waitlist' ? 'secondary' : 'outline'
                          }
                        >
                          {booking.status}
                        </Badge>
                        {(booking as any).waitlist && (booking as any).waitlist.length > 0 && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Users className="h-4 w-4 mr-1" />
                            {(booking as any).waitlist.length} on waitlist
                          </div>
                        )}
                        {canCancelBooking(booking) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelBooking(booking.id)}
                            disabled={isCancelling === booking.id}
                          >
                            <X className="h-4 w-4 mr-1" />
                            {isCancelling === booking.id ? 'Cancelling...' : 'Cancel'}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}