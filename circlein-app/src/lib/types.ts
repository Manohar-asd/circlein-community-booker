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
  description?: string;
  maxCapacity: number;
  isActive: boolean;
}

// Booking types
export interface Booking {
  id: string;
  userId: string;
  amenityId: string;
  startTime: Date | { toDate?: () => Date };
  endTime: Date | { toDate?: () => Date };
  status: 'confirmed' | 'cancelled' | 'waitlist';
  waitlist?: string[]; // Array of user IDs on waitlist
  createdAt: Date;
  updatedAt: Date;
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