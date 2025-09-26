import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('Missing required Google OAuth environment variables');
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/', error: '/' },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Normalize an id on the JWT
      const uid =
        (user as any)?.id ||
        (user as any)?.uid ||
        (token as any)?.id ||
        token.sub ||
        (profile as any)?.sub ||
        null;
      if (uid) (token as any).id = uid;

      // Optional role normalization
      const role =
        (user as any)?.role ||
        (token as any)?.role ||
        (profile as any)?.role ||
        'user';
      (token as any).role = role;

      return token;
    },
    async session({ session, token }) {
      // Expose id and role on session.user
      (session.user as any).id = (token as any).id || token.sub || session.user?.email || null;
      (session.user as any).role = (token as any).role || 'user';
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };