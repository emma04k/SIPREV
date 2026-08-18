import type { AuthenticatedUser } from './credentials'

type CaseAssignmentLike = {
  institutionId: string
  assignedUserId: string | null
  status: 'ACTIVE' | 'TRANSFERRED' | 'COMPLETED'
}

export type AuthorizableCase = {
  id: string
  publicCode: string
  reportingInstitutionId: string
  currentInstitutionId: string
  assignments: CaseAssignmentLike[]
}

function hasActiveAssignment(user: AuthenticatedUser, caseRecord: AuthorizableCase): boolean {
  return caseRecord.assignments.some(
    (assignment) =>
      assignment.status === 'ACTIVE' &&
      (assignment.assignedUserId === user.id || assignment.institutionId === user.institutionId),
  )
}

export function canAccessCase(user: AuthenticatedUser, caseRecord: AuthorizableCase): boolean {
  if (user.status !== 'ACTIVE' || user.institutionStatus !== 'ACTIVE') {
    return false
  }

  if (user.role === 'SYSTEM_ADMIN' || user.role === 'AUDITOR') {
    return true
  }

  if (user.role === 'CASE_WORKER') {
    return (
      caseRecord.reportingInstitutionId === user.institutionId ||
      caseRecord.currentInstitutionId === user.institutionId ||
      hasActiveAssignment(user, caseRecord)
    )
  }

  if (user.role === 'PROSECUTOR') {
    return caseRecord.currentInstitutionId === user.institutionId || hasActiveAssignment(user, caseRecord)
  }

  return hasActiveAssignment(user, caseRecord)
}
