import type { AuthenticatedUser } from '@/lib/auth/credentials'

type ActiveAssignmentWhere = {
  assignments: {
    some: {
      status: 'ACTIVE'
      OR: Array<{ assignedUserId: string } | { institutionId: string }>
    }
  }
}

type InstitutionWhere = { reportingInstitutionId: string } | { currentInstitutionId: string }

export type AuthorizedCaseWhere = undefined | null | ActiveAssignmentWhere | { OR: Array<InstitutionWhere | ActiveAssignmentWhere> }

function activeAssignmentWhereForUser(user: AuthenticatedUser): ActiveAssignmentWhere {
  return {
    assignments: {
      some: {
        status: 'ACTIVE',
        OR: [{ assignedUserId: user.id }, { institutionId: user.institutionId }],
      },
    },
  }
}

export function authorizedCasesWhereForUser(user: AuthenticatedUser): AuthorizedCaseWhere {
  if (user.status !== 'ACTIVE' || user.institutionStatus !== 'ACTIVE') {
    return null
  }

  if (user.role === 'SYSTEM_ADMIN' || user.role === 'AUDITOR') {
    return undefined
  }

  const activeAssignmentWhere = activeAssignmentWhereForUser(user)

  if (user.role === 'CASE_WORKER') {
    return {
      OR: [
        { reportingInstitutionId: user.institutionId },
        { currentInstitutionId: user.institutionId },
        activeAssignmentWhere,
      ],
    }
  }

  if (user.role === 'PROSECUTOR') {
    return {
      OR: [{ currentInstitutionId: user.institutionId }, activeAssignmentWhere],
    }
  }

  return activeAssignmentWhere
}
