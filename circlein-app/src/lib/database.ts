import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDocs, 
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { Amenity, BookingRules, AccessCode, Booking } from './types';

// Initialize default amenities
export const initializeAmenities = async () => {
  const amenities: Omit<Amenity, 'id'>[] = [
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
};

// Initialize default booking rules
export const initializeBookingRules = async () => {
  const rules: BookingRules = {
    maxPerFamily: 2,
    maxAdvanceBookingDays: 7,
    minBookingDuration: 30, // 30 minutes
    maxBookingDuration: 120, // 2 hours
    cancellationDeadline: 2, // 2 hours before booking
  };

  await setDoc(doc(db, 'rules', 'bookingLimits'), rules);
};

// Generate access codes
export const generateAccessCodes = async (count: number = 10) => {
  const codes: AccessCode[] = [];
  
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const accessCode: Omit<AccessCode, 'id'> = {
      code,
      isUsed: false,
      createdAt: new Date(),
    };
    
    const docRef = await addDoc(collection(db, 'accessCodes'), accessCode);
    codes.push({ ...accessCode, id: docRef.id });
  }
  
  return codes;
};

// Get amenities
export const getAmenities = async (): Promise<Amenity[]> => {
  const querySnapshot = await getDocs(collection(db, 'amenities'));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Amenity));
};

// Get booking rules
export const getBookingRules = async (): Promise<BookingRules | null> => {
  const docRef = doc(db, 'rules', 'bookingLimits');
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data() as BookingRules;
  }
  
  return null;
};

// Get bookings for a specific date
export const getBookingsForDate = async (date: Date): Promise<Booking[]> => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const q = query(
    collection(db, 'bookings'),
    where('startTime', '>=', Timestamp.fromDate(startOfDay)),
    where('startTime', '<=', Timestamp.fromDate(endOfDay)),
    orderBy('startTime')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Booking));
};

// Real-time listener for bookings
export const subscribeToBookings = (date: Date, callback: (bookings: Booking[]) => void) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const q = query(
    collection(db, 'bookings'),
    where('startTime', '>=', Timestamp.fromDate(startOfDay)),
    where('startTime', '<=', Timestamp.fromDate(endOfDay)),
    orderBy('startTime')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const bookings = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Booking));
    callback(bookings);
  });
};