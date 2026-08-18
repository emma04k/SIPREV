import { compare } from 'bcryptjs'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'

export const DEMO_AUTH_PASSWORD = 'SiprevDemo2026!'

export type AuthRole = 'SYSTEM_ADMIN' | 'INSTITUTION_ADMIN' | 'CASE_WORKER' | 'PROSECUTOR' | 'AUDITOR'
export type AccountStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED'
export type InstitutionStatus = 'ACTIVE' | 'INACTIVE'

export type AuthenticatedUser = {
  id: string
  email: string
  displayName: string
  role: AuthRole
  status: AccountStatus
  institutionId: string
  institutionCode: string
  institutionStatus: InstitutionStatus
}

type CredentialUserRecord = {
  id: string
  email: string
  displayName: string
  role: AuthRole
  status: AccountStatus
  institutionId: string
  passwordHash: string | null
  institution: {
    code: string
    status: InstitutionStatus
  }
}

export type CredentialUserRepository = {
  findUserByEmail(email: string): Promise<CredentialUserRecord | null>
}

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(256),
})

export const prismaCredentialUserRepository: CredentialUserRepository = {
  async findUserByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        institutionId: true,
        passwordHash: true,
        institution: {
          select: {
            code: true,
            status: true,
          },
        },
      },
    })
  },
}

export function publicRegistrationEnabled(): boolean {
  return false
}

export function toAuthenticatedUser(user: CredentialUserRecord): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    institutionId: user.institutionId,
    institutionCode: user.institution.code,
    institutionStatus: user.institution.status,
  }
}

export async function authorizeCredentials(
  rawCredentials: unknown,
  repository: CredentialUserRepository = prismaCredentialUserRepository,
): Promise<AuthenticatedUser | null> {
  const parsed = credentialsSchema.safeParse(rawCredentials)

  if (!parsed.success) {
    return null
  }

  const email = parsed.data.email.toLowerCase()
  const user = await repository.findUserByEmail(email)

  if (!user || user.status !== 'ACTIVE' || user.institution.status !== 'ACTIVE' || !user.passwordHash) {
    return null
  }

  const passwordMatches = await compare(parsed.data.password, user.passwordHash)

  if (!passwordMatches) {
    return null
  }

  return toAuthenticatedUser(user)
}
