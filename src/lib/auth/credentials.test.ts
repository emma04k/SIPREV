import { hashSync } from 'bcryptjs'
import { describe, expect, it } from 'vitest'

import { DEMO_AUTH_PASSWORD, authorizeCredentials, publicRegistrationEnabled } from './credentials'

type DemoUserFixture = {
  id: string
  email: string
  displayName: string
  role: 'CASE_WORKER'
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED'
  institutionId: string
  passwordHash: string
  institution: {
    code: string
    status: 'ACTIVE' | 'INACTIVE'
  }
}

const activeDemoUser: DemoUserFixture = {
  id: 'demo-user-comisaria',
  email: 'comisaria.demo@siprev.local',
  displayName: 'Operadora Demo Comisaría',
  role: 'CASE_WORKER',
  status: 'ACTIVE',
  institutionId: 'demo-inst-comisaria-norte',
  passwordHash: hashSync('SiprevDemo2026!', 10),
  institution: {
    code: 'COMISARIA-DEMO-NORTE',
    status: 'ACTIVE',
  },
}

function repositoryReturning(user: DemoUserFixture | null) {
  return {
    findUserByEmail: async () => user,
  }
}

describe('Phase 3 credentials authentication contract', () => {
  it('rejects invalid email formats and invalid passwords with a generic null result', async () => {
    await expect(
      authorizeCredentials({ email: 'not-an-email', password: DEMO_AUTH_PASSWORD }, repositoryReturning(activeDemoUser)),
    ).resolves.toBeNull()

    await expect(
      authorizeCredentials({ email: activeDemoUser.email, password: 'wrong-password' }, repositoryReturning(activeDemoUser)),
    ).resolves.toBeNull()
  })

  it('authenticates a precreated seeded demo account with the local demo password', async () => {
    const user = await authorizeCredentials(
      { email: activeDemoUser.email.toUpperCase(), password: DEMO_AUTH_PASSWORD },
      repositoryReturning(activeDemoUser),
    )

    expect(user).toMatchObject({
      id: 'demo-user-comisaria',
      email: activeDemoUser.email,
      displayName: 'Operadora Demo Comisaría',
      role: 'CASE_WORKER',
      institutionId: 'demo-inst-comisaria-norte',
      institutionCode: 'COMISARIA-DEMO-NORTE',
      institutionStatus: 'ACTIVE',
    })
    expect(user).not.toHaveProperty('passwordHash')
  })

  it.each(['SUSPENDED', 'REVOKED'] as const)('rejects a %s account even when the password is correct', async (status) => {
    await expect(
      authorizeCredentials(
        { email: activeDemoUser.email, password: DEMO_AUTH_PASSWORD },
        repositoryReturning({ ...activeDemoUser, status }),
      ),
    ).resolves.toBeNull()
  })

  it('rejects a user from an inactive institution even when the account and password are valid', async () => {
    await expect(
      authorizeCredentials(
        { email: activeDemoUser.email, password: DEMO_AUTH_PASSWORD },
        repositoryReturning({ ...activeDemoUser, institution: { ...activeDemoUser.institution, status: 'INACTIVE' } }),
      ),
    ).resolves.toBeNull()
  })

  it('does not expose any public registration path', () => {
    expect(publicRegistrationEnabled()).toBe(false)
  })
})
