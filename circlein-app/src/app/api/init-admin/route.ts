import { NextRequest, NextResponse } from 'next/server';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { ApiResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Email, password, and full name are required',
      });
    }

    // Create admin user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Store admin user data
    await setDoc(doc(db, 'users', user.uid), {
      name: fullName,
      email: email,
      role: 'admin',
      createdAt: new Date(),
    });

    // Initialize amenities
    const amenities = [
      {
        name: 'Badminton Court',
        description: 'Professional badminton court with proper lighting',
        maxCapacity: 4,
        isActive: true,
      },
      {
        name: 'Swimming Pool',
        description: 'Olympic-size swimming pool',
        maxCapacity: 20,
        isActive: true,
      },
      {
        name: 'Gym',
        description: 'Fully equipped fitness center',
        maxCapacity: 15,
        isActive: true,
      },
      {
        name: 'Tennis Court',
        description: 'Professional tennis court',
        maxCapacity: 4,
        isActive: true,
      },
      {
        name: 'Community Hall',
        description: 'Large hall for events and gatherings',
        maxCapacity: 100,
        isActive: true,
      },
    ];

    for (const amenity of amenities) {
      const amenityRef = doc(collection(db, 'amenities'));
      await setDoc(amenityRef, {
        ...amenity,
        id: amenityRef.id,
      });
    }

    // Initialize booking rules
    await setDoc(doc(db, 'rules', 'bookingLimits'), {
      maxPerFamily: 2,
      maxAdvanceBookingDays: 7,
      minBookingDuration: 30,
      maxBookingDuration: 120,
      cancellationDeadline: 2,
    });

    // Generate initial access codes
    const codes = [];
    for (let i = 0; i < 20; i++) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      await addDoc(collection(db, 'accessCodes'), {
        code,
        isUsed: false,
        createdAt: new Date(),
      });
      codes.push(code);
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        message: 'Admin user created and database initialized',
        adminEmail: email,
        accessCodes: codes,
      },
    });
  } catch (error: unknown) {
    console.error('Admin initialization error:', error);
    
    let errorMessage = 'Failed to initialize admin';
    
    if (error && typeof error === 'object' && 'code' in error) {
      const firebaseError = error as { code: string };
      if (firebaseError.code === 'auth/email-already-in-use') {
        errorMessage = 'Email is already registered';
      } else if (firebaseError.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      }
    }

    return NextResponse.json<ApiResponse>({
      success: false,
      error: errorMessage,
    });
  }
}