import { describe, expect, it } from 'vitest'

import { canAccessCase } from './permissions'

const baseUser = {
  id: 'demo-user-comisaria',
  email: 'comisaria.demo@siprev.local',
  displayName: 'Operadora Demo Comisaría',
  status: 'ACTIVE' as const,
  institutionId: 'demo-inst-comisaria-norte',
  institutionCode: 'COMISARIA-DEMO-NORTE',
  institutionStatus: 'ACTIVE' as const,
}

const demoCaseOne = {
  id: 'demo-case-001',
  publicCode: 'SIPREV-DEMO-CASE-001',
  reportingInstitutionId: 'demo-inst-comisaria-norte',
  currentInstitutionId: 'demo-inst-comisaria-norte',
  assignments: [
    {
      institutionId: 'demo-inst-comisaria-norte',
      assignedUserId: 'demo-user-comisaria',
      status: 'ACTIVE' as const,
    },
  ],
}

const demoCaseTwo = {
  id: 'demo-case-002',
  publicCode: 'SIPREV-DEMO-CASE-002',
  reportingInstitutionId: 'demo-inst-comisaria-norte',
  currentInstitutionId: 'demo-inst-fiscalia-control',
  assignments: [
    {
      institutionId: 'demo-inst-fiscalia-control',
      assignedUserId: 'demo-user-fiscalia',
      status: 'ACTIVE' as const,
    },
    {
      institutionId: 'demo-inst-auditoria',
      assignedUserId: 'demo-user-auditor',
      status: 'ACTIVE' as const,
    },
  ],
}

describe('Phase 3 canAccessCase authorization contract', () => {
  it.each(['SYSTEM_ADMIN', 'AUDITOR'] as const)('allows %s to access the expected demo cases', (role) => {
    const user = { ...baseUser, role, institutionId: role === 'AUDITOR' ? 'demo-inst-auditoria' : baseUser.institutionId }

    expect(canAccessCase(user, demoCaseOne)).toBe(true)
    expect(canAccessCase(user, demoCaseTwo)).toBe(true)
  })

  it('allows case workers through reporting/current institution or direct active assignment', () => {
    const worker = { ...baseUser, role: 'CASE_WORKER' as const }

    expect(canAccessCase(worker, demoCaseOne)).toBe(true)
    expect(canAccessCase(worker, demoCaseTwo)).toBe(true)
  })

  it('allows prosecutors through current institution or direct active assignment', () => {
    const prosecutor = {
      ...baseUser,
      id: 'demo-user-fiscalia',
      role: 'PROSECUTOR' as const,
      institutionId: 'demo-inst-fiscalia-control',
      institutionCode: 'FISCALIA-DEMO-CONTROL',
    }

    expect(canAccessCase(prosecutor, demoCaseTwo)).toBe(true)
  })

  it('limits institution admins to active assignments instead of granting broad institution-wide case access', () => {
    const institutionAdmin = {
      ...baseUser,
      id: 'demo-user-institution-admin',
      role: 'INSTITUTION_ADMIN' as const,
    }

    expect(canAccessCase(institutionAdmin, demoCaseOne)).toBe(true)
    expect(
      canAccessCase(institutionAdmin, {
        ...demoCaseOne,
        assignments: [{ institutionId: institutionAdmin.institutionId, assignedUserId: null, status: 'TRANSFERRED' as const }],
      }),
    ).toBe(false)
    expect(
      canAccessCase(institutionAdmin, {
        ...demoCaseOne,
        reportingInstitutionId: institutionAdmin.institutionId,
        currentInstitutionId: institutionAdmin.institutionId,
        assignments: [],
      }),
    ).toBe(false)
  })

  it('denies unrelated active users and non-active users', () => {
    const unrelatedWorker = {
      ...baseUser,
      id: 'demo-user-unrelated',
      role: 'CASE_WORKER' as const,
      institutionId: 'demo-inst-unrelated',
      institutionCode: 'UNRELATED-DEMO',
    }

    expect(canAccessCase(unrelatedWorker, demoCaseOne)).toBe(false)
    expect(canAccessCase({ ...baseUser, role: 'SYSTEM_ADMIN' as const, status: 'SUSPENDED' as const }, demoCaseOne)).toBe(false)
  })
})
