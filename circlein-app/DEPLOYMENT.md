# CircleIn Deployment Guide

This guide will help you deploy the CircleIn application to Vercel.

## Prerequisites

1. **Firebase Project Setup**
   - Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Firestore Database
   - Enable Authentication (Email/Password and Google)
   - Get your Firebase configuration

2. **Google OAuth Setup** (Optional)
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (for development)
     - `https://your-domain.vercel.app/api/auth/callback/google` (for production)

## Step-by-Step Deployment

### 1. Prepare Your Repository

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit"

# Push to GitHub/GitLab
git remote add origin <your-repository-url>
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your Git repository
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (or leave empty)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (auto-detected)

### 3. Set Environment Variables

In your Vercel project dashboard, go to Settings > Environment Variables and add:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# NextAuth Configuration
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your_secure_random_string

# Google OAuth (if using)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**Important**: 
- Replace `your-domain.vercel.app` with your actual Vercel domain
- Generate a secure random string for `NEXTAUTH_SECRET` (you can use `openssl rand -base64 32`)

### 4. Initialize the System

1. Visit your deployed application
2. Go to `/setup` to initialize the system
3. Create an admin account
4. Note down the generated access codes
5. Share access codes with residents

### 5. Configure Firebase Security Rules

In Firebase Console > Firestore > Rules, use these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Anyone can read amenities and rules
    match /amenities/{document} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    match /rules/{document} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Bookings: users can read all, write their own
    match /bookings/{bookingId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow update, delete: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
    
    // Access codes: only admins can manage
    match /accessCodes/{codeId} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

## Post-Deployment Checklist

- [ ] Application loads without errors
- [ ] Can access `/setup` page
- [ ] Admin account created successfully
- [ ] Access codes generated
- [ ] Can sign in with admin account
- [ ] Admin dashboard accessible
- [ ] Can create new bookings
- [ ] Real-time updates working
- [ ] Google OAuth working (if configured)

## Troubleshooting

### Common Issues

1. **"Unauthorized" errors**
   - Check Firebase security rules
   - Verify user roles in Firestore

2. **NextAuth errors**
   - Verify `NEXTAUTH_URL` matches your domain
   - Check `NEXTAUTH_SECRET` is set

3. **Firebase connection issues**
   - Verify all Firebase environment variables
   - Check Firebase project configuration

4. **Build failures**
   - Check for TypeScript errors
   - Verify all dependencies are installed

### Support

If you encounter issues:
1. Check Vercel function logs
2. Check Firebase console for errors
3. Review the application logs in browser console

## Custom Domain (Optional)

1. In Vercel dashboard, go to Settings > Domains
2. Add your custom domain
3. Update `NEXTAUTH_URL` environment variable
4. Update Google OAuth redirect URIs

## Monitoring

- Use Vercel Analytics for performance monitoring
- Monitor Firebase usage in the console
- Set up alerts for critical errors

Your CircleIn application is now ready for production use!