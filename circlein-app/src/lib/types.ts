// User types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'resident';
  createdAt: Date;
}

// Access code types
export interface AccessCode {
  id: string;
  code: string;
  isUsed: boolean;
  usedBy?: string;
  usedAt?: Date;
  createdAt: Date;
}

// Amenity types
export interface Amenity {
  id: string;
  name: string;
  [key: string]: any;
}

// Firestore timestamp-like type
export type FirestoreTsLike = { toDate: () => Date } & Record<string, any>;

// Booking types
export interface Booking {
  id: string;
  amenityId: string;
  startTime: Date | FirestoreTsLike;
  endTime: Date | FirestoreTsLike;
  status: 'confirmed' | 'waitlist' | 'cancelled' | string;
  waitlist?: { userId: string; userName?: string }[];
  userId: string;
  // Optional extras kept for compatibility
  date?: string;
  timeSlot?: string;
  [key: string]: any;
}

// Rules types
export interface BookingRules {
  maxPerFamily: number;
  maxAdvanceBookingDays: number;
  minBookingDuration: number; // in minutes
  maxBookingDuration: number; // in minutes
  cancellationDeadline: number; // hours before booking
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}