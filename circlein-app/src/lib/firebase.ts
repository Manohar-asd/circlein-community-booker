import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

// Validate required environment variables
const requiredEnvVars = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => `NEXT_PUBLIC_FIREBASE_${key.toUpperCase().replace(/([A-Z])/g, '_$1')}`);

if (missingVars.length > 0) {
  throw new Error(`Missing required Firebase environment variables: ${missingVars.join(', ')}`);
}

// Firebase configuration
const firebaseConfig = {
  apiKey: requiredEnvVars.apiKey!,
  authDomain: requiredEnvVars.authDomain!,
  projectId: requiredEnvVars.projectId!,
  storageBucket: requiredEnvVars.storageBucket!,
  messagingSenderId: requiredEnvVars.messagingSenderId!,
  appId: requiredEnvVars.appId!,
};

// Initialize Firebase app only once to prevent re-initialization
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  // Initialize Firebase services
  db = getFirestore(app);
  auth = getAuth(app);
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
  throw new Error('Firebase initialization failed. Please check your configuration.');
}

// Export Firebase services
export { db, auth };
export default app;

// Export configuration for debugging (development only)
export const getFirebaseConfig = () => {
  if (process.env.NODE_ENV === 'development') {
    return {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      // Don't expose sensitive keys
    };
  }
  return null;
};