import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

import { authorizeCredentials, type AuthenticatedUser } from '@/lib/auth/credentials'

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  pages: {
    signIn: '/auth/login',
  },
  session: {
    strategy: 'jwt',
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Correo institucional', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      authorize: async (credentials) => authorizeCredentials(credentials),
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const authenticatedUser = user as AuthenticatedUser

        token.userId = authenticatedUser.id
        token.email = authenticatedUser.email
        token.displayName = authenticatedUser.displayName
        token.role = authenticatedUser.role
        token.status = authenticatedUser.status
        token.institutionId = authenticatedUser.institutionId
        token.institutionCode = authenticatedUser.institutionCode
        token.institutionStatus = authenticatedUser.institutionStatus
      }

      return token
    },
    session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId
        session.user.email = token.email ?? session.user.email
        session.user.displayName = token.displayName
        session.user.role = token.role
        session.user.status = token.status
        session.user.institutionId = token.institutionId
        session.user.institutionCode = token.institutionCode
        session.user.institutionStatus = token.institutionStatus
      }

      return session
    },
  },
})
