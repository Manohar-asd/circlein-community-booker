import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ApiResponse, BookingRules } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession();
    if (!session?.user?.id || session.user?.role !== 'admin') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const rules: BookingRules = await request.json();

    // Validate rules
    if (rules.maxPerFamily < 1 || rules.maxPerFamily > 10) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Max per family must be between 1 and 10',
      });
    }

    if (rules.maxAdvanceBookingDays < 1 || rules.maxAdvanceBookingDays > 30) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Max advance booking days must be between 1 and 30',
      });
    }

    if (rules.minBookingDuration < 15 || rules.minBookingDuration > 60) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Min booking duration must be between 15 and 60 minutes',
      });
    }

    if (rules.maxBookingDuration < 30 || rules.maxBookingDuration > 480) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Max booking duration must be between 30 and 480 minutes',
      });
    }

    if (rules.cancellationDeadline < 1 || rules.cancellationDeadline > 24) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Cancellation deadline must be between 1 and 24 hours',
      });
    }

    if (rules.minBookingDuration >= rules.maxBookingDuration) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Min booking duration must be less than max booking duration',
      });
    }

    // Update rules in Firestore
    await setDoc(doc(db, 'rules', 'bookingLimits'), rules);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { message: 'Booking rules updated successfully' },
    });
  } catch (error) {
    console.error('Rules update error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to update booking rules',
    });
  }
}