# CircleIn - Community Amenities Booking System

A modern, full-stack web application for managing community amenities bookings with real-time updates, waitlist functionality, and admin controls.

## Features

- **User Authentication**: Email/password and Google OAuth authentication
- **Access Code System**: Secure registration with society access codes
- **Real-time Booking Management**: Live updates using Firestore listeners
- **Calendar Interface**: Interactive calendar for date selection
- **Waitlist System**: Automatic waitlist management when slots are full
- **Admin Dashboard**: Complete admin controls for codes and rules
- **Responsive Design**: Modern UI built with Tailwind CSS and shadcn/ui

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, NextAuth.js
- **Database**: Google Firestore
- **Authentication**: NextAuth.js with Google OAuth and Credentials
- **Icons**: Lucide React
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- Firebase project with Firestore enabled
- Google OAuth credentials (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd circlein-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory with the following variables:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

4. Initialize the database:
```bash
# Make a POST request to /api/init to set up initial data
curl -X POST http://localhost:3000/api/init
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Database Schema

### Collections

- **users**: User profiles and roles
- **accessCodes**: One-time registration codes
- **amenities**: Available amenities and their details
- **bookings**: Booking records with status and waitlist
- **rules**: System configuration and limits

### Key Features

- **Real-time Updates**: All booking changes are reflected immediately
- **Waitlist Management**: Automatic promotion when slots become available
- **Booking Rules**: Configurable limits and restrictions
- **Admin Controls**: Generate codes, manage rules, view statistics

## Deployment

### Vercel Deployment

1. Push your code to a Git repository
2. Connect your repository to Vercel
3. Set the environment variables in Vercel dashboard
4. Deploy!

The application is configured for serverless deployment on Vercel with proper API route handling.

### Environment Variables for Production

Make sure to set all the environment variables in your Vercel dashboard:

- All Firebase configuration variables
- NextAuth URL (your production domain)
- NextAuth secret
- Google OAuth credentials (if using Google sign-in)

## Usage

### For Residents

1. **Sign Up**: Use an access code provided by your society admin
2. **Sign In**: Use email/password or Google account
3. **Book Amenities**: Select date, time, and amenity
4. **Manage Bookings**: View and cancel your bookings
5. **Waitlist**: Get automatically added to waitlist when slots are full

### For Admins

1. **Access Admin Panel**: Sign in with admin account
2. **Generate Access Codes**: Create new registration codes
3. **Configure Rules**: Set booking limits and restrictions
4. **View Statistics**: Monitor amenity usage

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/bookings/create` - Create new booking
- `POST /api/bookings/cancel` - Cancel booking
- `POST /api/admin/generate-codes` - Generate access codes (admin)
- `POST /api/admin/update-rules` - Update booking rules (admin)
- `POST /api/init` - Initialize database with sample data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.