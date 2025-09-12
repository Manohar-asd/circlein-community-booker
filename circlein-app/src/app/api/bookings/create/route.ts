import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getBookingRules } from '@/lib/database';
import { ApiResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const { amenityId, startTime, endTime } = await request.json();

    // Validate required fields
    if (!amenityId || !startTime || !endTime) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'All fields are required',
      });
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    // Get booking rules
    const rules = await getBookingRules();
    if (!rules) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Booking rules not configured',
      });
    }

    // Validate booking duration
    const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
    if (durationMinutes < rules.minBookingDuration) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `Minimum booking duration is ${rules.minBookingDuration} minutes`,
      });
    }

    if (durationMinutes > rules.maxBookingDuration) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `Maximum booking duration is ${rules.maxBookingDuration} minutes`,
      });
    }

    // Check advance booking limit
    const now = new Date();
    const maxAdvanceDate = new Date(now.getTime() + (rules.maxAdvanceBookingDays * 24 * 60 * 60 * 1000));
    if (startDate > maxAdvanceDate) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `Cannot book more than ${rules.maxAdvanceBookingDays} days in advance`,
      });
    }

    // Check if booking is in the past
    if (startDate < now) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Cannot book in the past',
      });
    }

    // Check for existing bookings for the same amenity and time
    const existingBookingsQuery = query(
      collection(db, 'bookings'),
      where('amenityId', '==', amenityId),
      where('status', '==', 'confirmed'),
      where('startTime', '<=', Timestamp.fromDate(endDate)),
      where('endTime', '>=', Timestamp.fromDate(startDate))
    );

    const existingBookings = await getDocs(existingBookingsQuery);

    if (!existingBookings.empty) {
      // Check if there's a waitlist spot available
      const conflictingBooking = existingBookings.docs[0];
      const bookingData = conflictingBooking.data();
      
      if (!bookingData.waitlist) {
        bookingData.waitlist = [];
      }

      // Add to waitlist
      await addDoc(collection(db, 'bookings'), {
        userId: session.user.id,
        amenityId,
        startTime: Timestamp.fromDate(startDate),
        endTime: Timestamp.fromDate(endDate),
        status: 'waitlist',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return NextResponse.json<ApiResponse>({
        success: true,
        data: { 
          message: 'Added to waitlist',
          status: 'waitlist'
        },
      });
    }

    // Check user's existing bookings for the same day
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startDate);
    endOfDay.setHours(23, 59, 59, 999);

    const userBookingsQuery = query(
      collection(db, 'bookings'),
      where('userId', '==', session.user.id),
      where('startTime', '>=', Timestamp.fromDate(startOfDay)),
      where('startTime', '<=', Timestamp.fromDate(endOfDay)),
      where('status', '==', 'confirmed')
    );

    const userBookings = await getDocs(userBookingsQuery);

    if (userBookings.size >= rules.maxPerFamily) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `Maximum ${rules.maxPerFamily} bookings per family per day`,
      });
    }

    // Create the booking
    const bookingRef = await addDoc(collection(db, 'bookings'), {
      userId: session.user.id,
      amenityId,
      startTime: Timestamp.fromDate(startDate),
      endTime: Timestamp.fromDate(endDate),
      status: 'confirmed',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { 
        id: bookingRef.id,
        message: 'Booking created successfully'
      },
    });
  } catch (error) {
    console.error('Booking creation error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to create booking',
    });
  }
}