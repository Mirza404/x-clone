import GoogleProvider from 'next-auth/providers/google';
import NextAuth from 'next-auth';
import { NextAuthOptions } from 'next-auth';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import client from '@/app/lib/db';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  adapter: MongoDBAdapter(client),
  callbacks: {
    async session({ session, token }) {
      // Customize session to include user id from token

      if (session?.user) {
        //@ts-ignore
        session.user.id = token.sub; // Add user ID to session
      }
      return session;
    },
    async jwt({ user, token }) {
      // Store user ID in JWT when user signs in

      if (user) {
        token.sub = user.id; // Assuming 'id' is returned from the provider
      }
      return token;
    },
  },
  session: {
    strategy: 'jwt', // Use JWT strategy
  },
};

export const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
