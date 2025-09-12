import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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

    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Booking ID is required',
      });
    }

    // Get the booking
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingDoc = await getDoc(bookingRef);

    if (!bookingDoc.exists()) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Booking not found',
      });
    }

    const bookingData = bookingDoc.data();

    // Check if user owns the booking or is admin
    if (bookingData.userId !== session.user.id && session.user?.role !== 'admin') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized to cancel this booking',
      }, { status: 403 });
    }

    // Check if booking can be cancelled (not in the past)
    const now = new Date();
    const startTime = bookingData.startTime.toDate();
    
    if (startTime <= now) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Cannot cancel a booking that has already started or passed',
      });
    }

    // If it's a confirmed booking, promote someone from waitlist
    if (bookingData.status === 'confirmed') {
      // Find the first waitlist booking for the same amenity and time slot
      const waitlistQuery = query(
        collection(db, 'bookings'),
        where('amenityId', '==', bookingData.amenityId),
        where('startTime', '==', bookingData.startTime),
        where('endTime', '==', bookingData.endTime),
        where('status', '==', 'waitlist'),
        orderBy('createdAt'),
        limit(1)
      );

      const waitlistSnapshot = await getDocs(waitlistQuery);

      if (!waitlistSnapshot.empty) {
        const waitlistBooking = waitlistSnapshot.docs[0];

        // Promote waitlist booking to confirmed
        await updateDoc(waitlistBooking.ref, {
          status: 'confirmed',
          updatedAt: new Date(),
        });

        // Delete the original booking
        await deleteDoc(bookingRef);

        return NextResponse.json<ApiResponse>({
          success: true,
          data: { 
            message: 'Booking cancelled and next person on waitlist has been promoted',
            promoted: true
          },
        });
      }
    }

    // If no waitlist or it's a waitlist booking, just delete it
    await deleteDoc(bookingRef);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { 
        message: 'Booking cancelled successfully',
        promoted: false
      },
    });
  } catch (error) {
    console.error('Booking cancellation error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to cancel booking',
    });
  }
}