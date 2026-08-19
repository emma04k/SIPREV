import type { AuthenticatedUser } from '@/lib/auth/credentials'
import { canAccessCase } from '@/lib/auth/permissions'
import type { FollowUpInput } from './follow-up-input'

export class CaseFollowUpNotFoundError extends Error {
  readonly status = 404

  constructor(message = 'Protected case not found') {
    super(message)
    this.name = 'CaseFollowUpNotFoundError'
  }
}

export class CaseFollowUpAuthorizationError extends Error {
  readonly status = 403

  constructor(message = 'The authenticated user cannot update this protected case') {
    super(message)
    this.name = 'CaseFollowUpAuthorizationError'
  }
}

type CaseForFollowUp = {
  id: string
  publicCode: string
  riskLevel: string
  status: string
  reportingInstitutionId: string
  currentInstitutionId: string
  assignments: Array<{
    institutionId: string
    assignedUserId: string | null
    status: 'ACTIVE' | 'TRANSFERRED' | 'COMPLETED'
  }>
}

type CaseFollowUpTransactionClient = {
  case: {
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>
  }
  caseEvent: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>
  }
  auditLog: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>
  }
}

export type CaseFollowUpPrismaClient = {
  case: {
    findUnique(args: {
      where: { publicCode: string }
      select: Record<string, unknown>
    }): Promise<CaseForFollowUp | null>
  }
  $transaction<T>(callback: (transactionClient: CaseFollowUpTransactionClient) => Promise<T>): Promise<T>
}

export type CreatedFollowUpSafeResponse = {
  publicCode: string
  event: {
    category: FollowUpInput['category']
    title: string
  }
  status: string
}

const followUpWritableRoles = new Set<AuthenticatedUser['role']>([
  'SYSTEM_ADMIN',
  'INSTITUTION_ADMIN',
  'CASE_WORKER',
  'PROSECUTOR',
])

export function userCanFollowUpCase(user: AuthenticatedUser, caseRecord: CaseForFollowUp): boolean {
  return followUpWritableRoles.has(user.role) && canAccessCase(user, caseRecord)
}

export async function createCaseFollowUp({
  prisma,
  actor,
  publicCode,
  input,
}: {
  prisma: CaseFollowUpPrismaClient
  actor: AuthenticatedUser
  publicCode: string
  input: FollowUpInput
}): Promise<CreatedFollowUpSafeResponse> {
  const caseRecord = await prisma.case.findUnique({
    where: { publicCode },
    select: {
      id: true,
      publicCode: true,
      riskLevel: true,
      status: true,
      reportingInstitutionId: true,
      currentInstitutionId: true,
      assignments: {
        select: {
          institutionId: true,
          assignedUserId: true,
          status: true,
        },
      },
    },
  })

  if (!caseRecord) {
    throw new CaseFollowUpNotFoundError()
  }

  if (!userCanFollowUpCase(actor, caseRecord)) {
    throw new CaseFollowUpAuthorizationError()
  }

  const statusChanged = Boolean(input.newStatus && input.newStatus !== caseRecord.status)
  const nextStatus = input.newStatus ?? caseRecord.status

  await prisma.$transaction(async (tx) => {
    if (statusChanged) {
      await tx.case.update({
        where: { id: caseRecord.id },
        data: {
          status: input.newStatus,
          closedAt: input.newStatus === 'CLOSED' ? new Date() : null,
        },
      })
    }

    await tx.caseEvent.create({
      data: {
        caseId: caseRecord.id,
        category: input.category,
        title: input.title,
        detail: input.detail,
        actorUserId: actor.id,
        institutionId: actor.institutionId,
      },
    })

    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        actorInstitutionId: actor.institutionId,
        caseId: caseRecord.id,
        action: 'UPDATE',
        entityType: 'Case',
        entityId: caseRecord.id,
        metadata: {
          publicCode: caseRecord.publicCode,
          eventCategory: input.category,
          previousStatus: caseRecord.status,
          newStatus: nextStatus,
          statusChanged,
        },
      },
    })
  })

  return {
    publicCode: caseRecord.publicCode,
    event: {
      category: input.category,
      title: input.title,
    },
    status: nextStatus,
  }
}
