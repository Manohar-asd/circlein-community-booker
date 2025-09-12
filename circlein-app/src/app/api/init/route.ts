import { NextRequest, NextResponse } from 'next/server';
import { initializeAmenities, initializeBookingRules, generateAccessCodes } from '@/lib/database';
import { ApiResponse } from '@/lib/types';

export async function POST() {
  try {
    // Initialize amenities
    await initializeAmenities();
    
    // Initialize booking rules
    await initializeBookingRules();
    
    // Generate access codes
    const codes = await generateAccessCodes(20);
    
    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        message: 'Database initialized successfully',
        accessCodes: codes.map(code => code.code),
      },
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to initialize database',
    });
  }
}