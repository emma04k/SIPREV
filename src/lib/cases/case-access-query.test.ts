import { describe, expect, it } from 'vitest'

import type { AuthenticatedUser } from '@/lib/auth/credentials'
import { authorizedCasesWhereForUser } from './case-access-query'

const baseUser: AuthenticatedUser = {
  id: 'demo-user-admin',
  email: 'admin@siprev.local',
  displayName: 'Admin Demo',
  role: 'INSTITUTION_ADMIN',
  status: 'ACTIVE',
  institutionId: 'demo-inst-comisaria-norte',
  institutionCode: 'COMISARIA-DEMO-NORTE',
  institutionStatus: 'ACTIVE',
}

type CaseForWhereTest = {
  reportingInstitutionId: string
  currentInstitutionId: string
  assignments: Array<{
    institutionId: string
    assignedUserId: string | null
    status: 'ACTIVE' | 'TRANSFERRED' | 'COMPLETED'
  }>
}

type CaseWhere = ReturnType<typeof authorizedCasesWhereForUser>
type AssignedCaseWhere = Extract<NonNullable<CaseWhere>, { assignments: unknown }>
type OrCaseWhere = Extract<NonNullable<CaseWhere>, { OR: unknown[] }>
type CaseWhereClause = OrCaseWhere['OR'][number] | AssignedCaseWhere

function caseMatchesWhere(caseRecord: CaseForWhereTest, where: CaseWhere | CaseWhereClause): boolean {
  if (where === null) {
    return false
  }

  if (where === undefined) {
    return true
  }

  if ('OR' in where && Array.isArray(where.OR)) {
    return where.OR.some((clause) => caseMatchesWhere(caseRecord, clause))
  }

  if ('reportingInstitutionId' in where) {
    return caseRecord.reportingInstitutionId === where.reportingInstitutionId
  }

  if ('currentInstitutionId' in where) {
    return caseRecord.currentInstitutionId === where.currentInstitutionId
  }

  if ('assignments' in where) {
    const assignmentFilter = where.assignments.some

    return caseRecord.assignments.some((assignment) => {
      const assignedToUser = assignmentFilter.OR.some((clause) =>
        'assignedUserId' in clause ? assignment.assignedUserId === clause.assignedUserId : assignment.institutionId === clause.institutionId,
      )

      return assignment.status === assignmentFilter.status && assignedToUser
    })
  }

  return false
}

describe('authorizedCasesWhereForUser dashboard query contract', () => {
  it('does not list same-institution cases for institution admins unless an active assignment exists', () => {
    const sameInstitutionWithoutActiveAssignment: CaseForWhereTest = {
      reportingInstitutionId: baseUser.institutionId,
      currentInstitutionId: baseUser.institutionId,
      assignments: [],
    }
    const sameInstitutionWithActiveAssignment: CaseForWhereTest = {
      reportingInstitutionId: 'other-reporting-inst',
      currentInstitutionId: 'other-current-inst',
      assignments: [{ institutionId: baseUser.institutionId, assignedUserId: null, status: 'ACTIVE' }],
    }

    const where = authorizedCasesWhereForUser(baseUser)

    expect(caseMatchesWhere(sameInstitutionWithoutActiveAssignment, where)).toBe(false)
    expect(caseMatchesWhere(sameInstitutionWithActiveAssignment, where)).toBe(true)
    expect(JSON.stringify(where)).not.toMatch(/reportingInstitutionId|currentInstitutionId/)
  })

  it('keeps broader case worker and prosecutor scopes aligned with canAccessCase', () => {
    const workerWhere = authorizedCasesWhereForUser({ ...baseUser, role: 'CASE_WORKER' })
    const prosecutorWhere = authorizedCasesWhereForUser({ ...baseUser, role: 'PROSECUTOR' })
    const reportingCase: CaseForWhereTest = {
      reportingInstitutionId: baseUser.institutionId,
      currentInstitutionId: 'other-current-inst',
      assignments: [],
    }
    const currentCase: CaseForWhereTest = {
      reportingInstitutionId: 'other-reporting-inst',
      currentInstitutionId: baseUser.institutionId,
      assignments: [],
    }

    expect(caseMatchesWhere(reportingCase, workerWhere)).toBe(true)
    expect(caseMatchesWhere(currentCase, workerWhere)).toBe(true)
    expect(caseMatchesWhere(reportingCase, prosecutorWhere)).toBe(false)
    expect(caseMatchesWhere(currentCase, prosecutorWhere)).toBe(true)
  })

  it('lists all cases only for active system admins and auditors, otherwise no cases', () => {
    expect(authorizedCasesWhereForUser({ ...baseUser, role: 'SYSTEM_ADMIN' })).toBeUndefined()
    expect(authorizedCasesWhereForUser({ ...baseUser, role: 'AUDITOR' })).toBeUndefined()
    expect(authorizedCasesWhereForUser({ ...baseUser, status: 'SUSPENDED' })).toBeNull()
    expect(authorizedCasesWhereForUser({ ...baseUser, institutionStatus: 'INACTIVE' })).toBeNull()
  })
})
