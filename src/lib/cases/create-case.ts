import { randomBytes } from 'node:crypto'

import type { AuthenticatedUser } from '@/lib/auth/credentials'

import type { CreateCaseInput } from './case-input'

const CREATE_CASE_ROLES = new Set<AuthenticatedUser['role']>([
  'SYSTEM_ADMIN',
  'INSTITUTION_ADMIN',
  'CASE_WORKER',
  'PROSECUTOR',
])

export class CaseCreationAuthorizationError extends Error {
  readonly status = 403

  constructor(message = 'The authenticated user cannot create protected cases') {
    super(message)
    this.name = 'CaseCreationAuthorizationError'
  }
}

type CreatedCaseRecord = {
  id: string
  publicCode: string
  caseType: CreateCaseInput['caseType']
  riskLevel: CreateCaseInput['riskLevel']
  status: 'OPEN' | string
}

type CaseCreationTransactionClient = {
  case: {
    create(args: { data: Record<string, unknown> }): Promise<CreatedCaseRecord>
  }
  protectedPerson: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>
  }
  aggressorReference: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>
  }
  caseEvent: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>
  }
  caseAssignment: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>
  }
  auditLog: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>
  }
}

export type CaseCreationPrismaClient = {
  $transaction<T>(callback: (transactionClient: CaseCreationTransactionClient) => Promise<T>): Promise<T>
}

export type CreatedCaseSafeResponse = {
  publicCode: string
  caseType: CreateCaseInput['caseType']
  riskLevel: CreateCaseInput['riskLevel']
  status: 'OPEN' | string
}

export function userCanCreateCase(user: Pick<AuthenticatedUser, 'role' | 'status' | 'institutionStatus'>): boolean {
  return user.status === 'ACTIVE' && user.institutionStatus === 'ACTIVE' && CREATE_CASE_ROLES.has(user.role)
}

export function generateCasePublicCode(date = new Date()): string {
  const year = date.getUTCFullYear()
  const suffix = randomBytes(4).toString('hex').toUpperCase()

  return `SIPREV-${year}-${suffix}`
}

export async function createCase({
  prisma,
  actor,
  input,
  generatePublicCode = generateCasePublicCode,
}: {
  prisma: CaseCreationPrismaClient
  actor: AuthenticatedUser
  input: CreateCaseInput
  generatePublicCode?: () => string
}): Promise<CreatedCaseSafeResponse> {
  if (!userCanCreateCase(actor)) {
    throw new CaseCreationAuthorizationError()
  }

  const publicCode = generatePublicCode()

  return prisma.$transaction(async (tx) => {
    const caseRecord = await tx.case.create({
      data: {
        publicCode,
        caseType: input.caseType,
        violenceTypes: input.violenceTypes,
        riskLevel: input.riskLevel,
        status: 'OPEN',
        nonSensitiveSummary: input.nonSensitiveSummary,
        reportingInstitutionId: actor.institutionId,
        currentInstitutionId: actor.institutionId,
        createdByUserId: actor.id,
      },
    })

    await tx.protectedPerson.create({
      data: {
        caseId: caseRecord.id,
        ...input.protectedPerson,
      },
    })

    if (input.aggressorReference) {
      await tx.aggressorReference.create({
        data: {
          caseId: caseRecord.id,
          ...input.aggressorReference,
        },
      })
    }

    await tx.caseEvent.create({
      data: {
        caseId: caseRecord.id,
        category: 'INTAKE',
        title: input.initialEvent.title,
        detail: input.initialEvent.detail,
        actorUserId: actor.id,
        institutionId: actor.institutionId,
      },
    })

    await tx.caseAssignment.create({
      data: {
        caseId: caseRecord.id,
        institutionId: actor.institutionId,
        assignedUserId: actor.id,
        status: 'ACTIVE',
        reason: 'Registro inicial protegido Fase 4 demo',
      },
    })

    const status = caseRecord.status ?? 'OPEN'

    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        actorInstitutionId: actor.institutionId,
        caseId: caseRecord.id,
        action: 'CREATE',
        entityType: 'Case',
        entityId: caseRecord.id,
        metadata: {
          publicCode: caseRecord.publicCode,
          riskLevel: caseRecord.riskLevel,
          status,
        },
      },
    })

    return {
      publicCode: caseRecord.publicCode,
      caseType: caseRecord.caseType,
      riskLevel: caseRecord.riskLevel,
      status,
    }
  })
}
