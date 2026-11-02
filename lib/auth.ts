import NextAuth, { type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'
import { AccountStatus, UserRole } from '@prisma/client'
import { accountMayAuthenticate, currentWebsiteIdentity } from '@/lib/account-policy'

// ── Type augmentation ─────────────────────────────────────────────────────────
// Extend the default session/token types so TypeScript knows about our fields.
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: UserRole
      accountStatus: AccountStatus
      companyId: string | null
    } & DefaultSession['user']
  }
  interface User {
    role: UserRole
    accountStatus: AccountStatus
    companyId: string | null
  }
}

// ── Credentials schema ────────────────────────────────────────────────────────
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// ── NextAuth configuration ────────────────────────────────────────────────────
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },

  providers: [
    Credentials({
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },

      async authorize(credentials) {
        // 1. Validate input shape
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        // 2. Look up user
        const user = await db.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { company: { select: { id: true } } },
        })
        if (!user || !user.passwordHash) return null

        // 3. Reject non-active accounts before checking password
        //    This gives a consistent UX — the error is shown at the page level,
        //    not here, so the caller should inspect the returned null + check status.
        if (!accountMayAuthenticate(user.accountStatus)) {
          // Return null; the page redirects to /login?error=account_inactive
          return null
        }

        // 4. Verify password
        const passwordMatch = await compare(password, user.passwordHash)
        if (!passwordMatch) return null

        // 5. Return the user object (mapped to NextAuth User type)
        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          accountStatus: user.accountStatus,
          companyId: user.company?.id ?? null,
        }
      },
    }),
  ],

  callbacks: {
    // Persist custom fields into the JWT token
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.accountStatus = user.accountStatus
        token.companyId = user.companyId
      }
      return token
    },

    // Expose custom fields on the session object
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
        session.user.accountStatus = token.accountStatus as AccountStatus
        session.user.companyId = (token.companyId as string) ?? null
      }
      return session
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',    // NextAuth error codes passed as ?error= query param
  },
})

// ── Route protection helpers ───────────────────────────────────────────────────

/** Use in Server Components / route handlers to require an authenticated session. */
export async function requireAuth() {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }
  const current = await currentWebsiteIdentity(session.user.id, async id => {
    const user = await db.user.findUnique({where:{id},select:{id:true,role:true,accountStatus:true,company:{select:{id:true}}}})
    return user ? {...user,companyId:user.company?.id??null} : null
  })
  session.user = {...session.user,id:current.id,role:current.role as UserRole,accountStatus:current.accountStatus as AccountStatus,companyId:current.companyId}
  return session
}

/** Use in Server Components / route handlers to require an admin session. */
export async function requireAdmin() {
  const session = await requireAuth()
  if (session.user.role !== UserRole.ADMIN) {
    throw new Error('Forbidden')
  }
  return session
}
