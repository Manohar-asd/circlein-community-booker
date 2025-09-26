import NextAuth, { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'admin' | 'resident';
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: 'admin' | 'resident';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'admin' | 'resident';
  }
}