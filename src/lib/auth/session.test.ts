import { describe, expect, it } from 'vitest'

import { AuthenticationRequiredError, buildSessionUser, requireUserFromSession } from './current-user'

const databaseUser = {
  id: 'demo-user-fiscalia',
  email: 'fiscalia.demo@siprev.local',
  displayName: 'Fiscal Demo Control',
  role: 'PROSECUTOR' as const,
  status: 'ACTIVE' as const,
  institutionId: 'demo-inst-fiscalia-control',
  institution: {
    code: 'FISCALIA-DEMO-CONTROL',
    status: 'ACTIVE' as const,
  },
}

describe('Phase 3 session and requireUser contract', () => {
  it('exposes the authenticated user fields needed for RBAC without leaking credential material', () => {
    const sessionUser = buildSessionUser(databaseUser)

    expect(sessionUser).toStrictEqual({
      id: 'demo-user-fiscalia',
      email: 'fiscalia.demo@siprev.local',
      displayName: 'Fiscal Demo Control',
      role: 'PROSECUTOR',
      status: 'ACTIVE',
      institutionId: 'demo-inst-fiscalia-control',
      institutionCode: 'FISCALIA-DEMO-CONTROL',
      institutionStatus: 'ACTIVE',
    })
    expect(sessionUser).not.toHaveProperty('passwordHash')
  })

  it('returns the user from an authenticated session', () => {
    const sessionUser = buildSessionUser(databaseUser)

    expect(requireUserFromSession({ user: sessionUser })).toStrictEqual(sessionUser)
  })

  it('throws a testable 401 error when no authenticated user is present', () => {
    expect(() => requireUserFromSession(null)).toThrow(AuthenticationRequiredError)

    try {
      requireUserFromSession({ user: undefined })
      throw new Error('Expected requireUserFromSession to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(AuthenticationRequiredError)
      expect((error as AuthenticationRequiredError).status).toBe(401)
      expect((error as AuthenticationRequiredError).message).toBe('Authentication required')
    }
  })
})
