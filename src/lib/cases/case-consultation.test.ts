import { describe, expect, it } from 'vitest'

import type { AuthenticatedUser } from '@/lib/auth/credentials'
import { buildAuthorizedCaseListQuery, parseCaseListFilters } from './case-consultation'

const baseUser: AuthenticatedUser = {
  id: 'demo-user-admin-institution',
  email: 'admin.inst@siprev.local',
  displayName: 'Admin Institución Demo',
  role: 'INSTITUTION_ADMIN',
  status: 'ACTIVE',
  institutionId: 'demo-inst-comisaria-norte',
  institutionCode: 'COMISARIA-DEMO-NORTE',
  institutionStatus: 'ACTIVE',
}

describe('Phase 5 authorized case consultation query contract', () => {
  it('keeps institution admins scoped to active assignments while applying status, risk, case type and query filters', () => {
    const query = buildAuthorizedCaseListQuery(baseUser, {
      status: 'IN_FOLLOW_UP',
      riskLevel: 'HIGH',
      caseType: 'POLICE_REPORT',
      q: 'SIPREV-DEMO-CASE-001',
    })

    expect(query).toMatchObject({
      take: 50,
      orderBy: { updatedAt: 'desc' },
      where: {
        AND: [
          {
            assignments: {
              some: {
                status: 'ACTIVE',
                OR: [{ assignedUserId: baseUser.id }, { institutionId: baseUser.institutionId }],
              },
            },
          },
          { status: 'IN_FOLLOW_UP' },
          { riskLevel: 'HIGH' },
          { caseType: 'POLICE_REPORT' },
          {
            OR: [
              { publicCode: { contains: 'SIPREV-DEMO-CASE-001', mode: 'insensitive' } },
              { nonSensitiveSummary: { contains: 'SIPREV-DEMO-CASE-001', mode: 'insensitive' } },
            ],
          },
        ],
      },
    })

    expect(JSON.stringify(query.where)).not.toContain('reportingInstitutionId')
    expect(JSON.stringify(query.where)).not.toContain('currentInstitutionId')
  })

  it('returns a no-match query for inactive actors instead of broadening RBAC', () => {
    const query = buildAuthorizedCaseListQuery({ ...baseUser, status: 'SUSPENDED' }, { q: 'SIPREV' })

    expect(query.where).toEqual({ id: '__siprev_no_authorized_cases__' })
  })

  it('normalizes bounded filter input and ignores empty query text', () => {
    expect(
      parseCaseListFilters({
        status: 'OPEN',
        riskLevel: 'MEDIUM',
        caseType: 'INITIAL_REPORT',
        q: '   ',
      }),
    ).toEqual({ status: 'OPEN', riskLevel: 'MEDIUM', caseType: 'INITIAL_REPORT' })
  })
})
