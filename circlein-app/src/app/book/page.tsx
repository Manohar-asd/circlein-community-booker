'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAmenities } from '@/lib/database';
import { Amenity } from '@/lib/types';
import { Calendar as CalendarIcon, Clock, ArrowLeft } from 'lucide-react';
import { addDays } from 'date-fns';

export default function BookPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [selectedAmenity, setSelectedAmenity] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
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
        setError('Failed to load amenities');
      }
    };

    loadAmenities();
  }, [session, status, router]);

  function formatLocalYYYYMMDD(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    if (!selectedAmenity || !startTime || !endTime) {
      setError('Please select amenity, start and end time.');
      setIsLoading(false);
      return;
    }

    // Resolve amenity name for display
    const amenity = amenities.find(a => a.id === selectedAmenity);
    const facilityName = amenity?.name ?? amenity?.title ?? '';

    const res = await fetch('/api/bookings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        facility: selectedAmenity,
        facilityName,
        date: formatLocalYYYYMMDD(selectedDate),
        timeSlot: `${startTime} - ${endTime}`,
      }),
    });
    const data = await res.json();

    if (res.ok && data.success) {
      setSuccess('Booking created successfully');
      setSelectedAmenity('');
      setStartTime('');
      setEndTime('');
    } else {
      setError(data.error || 'Failed to create booking');
    }

    setIsLoading(false);
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour < 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);
    maxDate.setHours(23, 59, 59, 999);
    
    return date < today || date > maxDate;
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 dark:border-white mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-slate-50 dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <CalendarIcon className="h-8 w-8 text-slate-900 dark:text-white mr-3" />
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">New Booking</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Create a New Booking</CardTitle>
            <CardDescription>
              Select an amenity, date, and time for your booking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Amenity Selection */}
                <div className="space-y-2">
                  <Label htmlFor="amenity">Select Amenity</Label>
                  <Select value={selectedAmenity} onValueChange={setSelectedAmenity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an amenity" />
                    </SelectTrigger>
                    <SelectContent>
                      {amenities.map((amenity) => (
                        <SelectItem key={amenity.id} value={amenity.id}>
                          {amenity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Selection */}
                <div className="space-y-2">
                  <Label>Select Date</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={isDateDisabled}
                    className="rounded-md border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Start Time */}
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Select value={startTime} onValueChange={setStartTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select start time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* End Time */}
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Select value={endTime} onValueChange={setEndTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select end time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-green-600 text-sm text-center bg-green-50 p-3 rounded-md">
                  {success}
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  <Clock className="mr-2 h-4 w-4" />
                  {isLoading ? 'Creating...' : 'Create Booking'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}