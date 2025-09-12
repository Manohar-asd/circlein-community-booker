import { NextRequest, NextResponse } from 'next/server';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { ApiResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { fullName, email, password, accessCode } = await request.json();

    // Validate required fields
    if (!fullName || !email || !password || !accessCode) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'All fields are required',
      });
    }

    // Check if access code is valid and unused
    const accessCodeDoc = await getDoc(doc(db, 'accessCodes', accessCode));
    
    if (!accessCodeDoc.exists()) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid access code',
      });
    }

    const accessCodeData = accessCodeDoc.data();
    
    if (accessCodeData.isUsed) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Access code has already been used',
      });
    }

    // Create user with Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Store user data in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      name: fullName,
      email: email,
      role: 'resident',
      createdAt: new Date(),
    });

    // Mark access code as used
    await updateDoc(doc(db, 'accessCodes', accessCode), {
      isUsed: true,
      usedBy: user.uid,
      usedAt: new Date(),
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { message: 'User created successfully' },
    });
  } catch (error: unknown) {
    console.error('Registration error:', error);
    
    let errorMessage = 'Registration failed';
    
    if (error && typeof error === 'object' && 'code' in error) {
      const firebaseError = error as { code: string };
      if (firebaseError.code === 'auth/email-already-in-use') {
        errorMessage = 'Email is already registered';
      } else if (firebaseError.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      } else if (firebaseError.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      }
    }

    return NextResponse.json<ApiResponse>({
      success: false,
      error: errorMessage,
    });
  }
}