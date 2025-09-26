import { withAuth } from 'next-auth/middleware';

// Keep UX: only gate /admin; do not block /dashboard or /book
export default withAuth(
  function middleware() {},
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const p = req.nextUrl.pathname;
        if (p.startsWith('/admin')) return (token as any)?.role === 'admin';
        return true; // allow everything else
      },
    },
  }
);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};