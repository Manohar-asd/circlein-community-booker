import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { generateAccessCodes } from '@/lib/database';
import { ApiResponse } from '@/lib/types';

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

    const { count = 10 } = await request.json();

    if (count < 1 || count > 50) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Count must be between 1 and 50',
      });
    }

    const codes = await generateAccessCodes(count);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        codes: codes.map(code => code.code),
        message: `Generated ${codes.length} access codes`,
      },
    });
  } catch (error) {
    console.error('Code generation error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to generate access codes',
    });
  }
}