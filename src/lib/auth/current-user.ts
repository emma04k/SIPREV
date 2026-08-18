import type { AuthenticatedUser } from './credentials'

export type AuthSession = {
  user?: AuthenticatedUser
} | null

export class AuthenticationRequiredError extends Error {
  readonly status = 401

  constructor(message = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationRequiredError'
  }
}

type SessionUserSource = Omit<AuthenticatedUser, 'institutionCode' | 'institutionStatus'> & {
  institutionCode?: AuthenticatedUser['institutionCode']
  institutionStatus?: AuthenticatedUser['institutionStatus']
  institution?: {
    code: AuthenticatedUser['institutionCode']
    status: AuthenticatedUser['institutionStatus']
  }
}

type SessionGetter = () => Promise<AuthSession>

export function buildSessionUser(user: SessionUserSource): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    institutionId: user.institutionId,
    institutionCode: user.institutionCode ?? user.institution?.code ?? '',
    institutionStatus: user.institutionStatus ?? user.institution?.status ?? 'INACTIVE',
  }
}

export function requireUserFromSession(session: AuthSession): AuthenticatedUser {
  if (!session?.user?.id) {
    throw new AuthenticationRequiredError()
  }

  return buildSessionUser(session.user)
}

async function getAuthSession(): Promise<AuthSession> {
  const { auth } = await import('../../../auth')
  const session = await auth()

  return session as AuthSession
}

export async function requireUser(getSession: SessionGetter = getAuthSession): Promise<AuthenticatedUser> {
  const session = await getSession()

  return requireUserFromSession(session)
}
