'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { subscribeToBookings, getAmenities } from '@/lib/database';
import { Amenity, Booking } from '@/lib/types';
import { SessionUser } from '@/types/next-auth';
import { Calendar as CalendarIcon, LogOut, Plus, Clock, Users, X, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

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

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/');
      return;
    }

    // Load amenities
    const loadAmenities = async () => {
      try {
        const amenitiesData = await getAmenities();
        setAmenities(amenitiesData);
      } catch (error) {
        console.error('Error loading amenities:', error);
      }
    };

    loadAmenities();
    setIsLoading(false);
  }, [session, status, router]);

  useEffect(() => {
    if (!session) return;

    // Subscribe to real-time bookings
    const unsubscribe = subscribeToBookings(selectedDate, (bookingsData: Booking[]) => {
      setBookings(bookingsData);
    });

    return () => unsubscribe();
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.data.message);
        // The real-time listener will update the bookings automatically
      } else {
        setError(data.error || 'Failed to cancel booking');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsCancelling(null);
    }
  };

  const canCancelBooking = (booking: Booking) => {
    const now = new Date();
    let startTime: Date;
    if ('toDate' in booking.startTime && booking.startTime.toDate) {
      startTime = booking.startTime.toDate();
    } else if (booking.startTime instanceof Date) {
      startTime = booking.startTime;
    } else {
      startTime = new Date(booking.startTime as string | number);
    }
    return startTime > now && booking.userId === (session?.user as SessionUser)?.id;
  };

  const getAmenityName = (amenityId: string) => {
    const amenity = amenities.find(a => a.id === amenityId);
    return amenity ? amenity.name : 'Unknown Amenity';
  };

  const formatTime = (timestamp: Date | { toDate?: () => Date }) => {
    if (!timestamp) return '';
    let date: Date;
    if ('toDate' in timestamp && timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp as string | number);
    }
    return format(date, 'HH:mm');
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">CircleIn Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {session.user?.name}</span>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Select a Date</CardTitle>
                <CardDescription>
                  Choose a date to view and manage bookings
                </CardDescription>
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
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/admin')}
                  >
                    Admin Panel
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Selected Date Info */}
            <Card>
              <CardHeader>
                <CardTitle>Selected Date</CardTitle>
                <CardDescription>
                  {format(selectedDate, 'EEEE, MMMM do, yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {bookings.length} Bookings
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mt-4 text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 text-green-600 text-sm text-center bg-green-50 p-3 rounded-md">
            {success}
          </div>
        )}

        {/* Bookings List */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Bookings for {format(selectedDate, 'MMMM do, yyyy')}</CardTitle>
              <CardDescription>
                All bookings scheduled for the selected date
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bookings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No bookings for this date</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking: Booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            booking.status === 'confirmed' ? 'bg-blue-100' : 
                            booking.status === 'waitlist' ? 'bg-yellow-100' : 'bg-gray-100'
                          }`}>
                            {booking.status === 'waitlist' ? (
                              <AlertCircle className="h-5 w-5 text-yellow-600" />
                            ) : (
                              <Clock className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {getAmenityName(booking.amenityId)}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                          </p>
                          {booking.userId === (session?.user as SessionUser)?.id && (
                            <p className="text-xs text-blue-600">Your booking</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={booking.status === 'confirmed' ? 'default' : 
                                  booking.status === 'waitlist' ? 'secondary' : 'outline'}
                        >
                          {booking.status}
                        </Badge>
                        {booking.waitlist && booking.waitlist.length > 0 && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Users className="h-4 w-4 mr-1" />
                            {booking.waitlist.length} on waitlist
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