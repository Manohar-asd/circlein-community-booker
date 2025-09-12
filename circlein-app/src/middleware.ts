import { withAuth } from 'next-auth/middleware';

export default withAuth(
  function middleware() {
    // Add any additional middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to setup page without authentication
        if (req.nextUrl.pathname === '/setup') {
          return true;
        }
        
        // Require authentication for all other routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/book/:path*',
    '/setup/:path*',
  ],
};