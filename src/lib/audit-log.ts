import type { Prisma } from '@prisma/client'

import type { AuthenticatedUser } from './auth/credentials'

type AuditPrismaClient = {
  auditLog: {
    create(args: { data: Prisma.AuditLogCreateInput | Prisma.AuditLogUncheckedCreateInput }): Promise<unknown>
  }
}

type SensitiveCaseForAudit = {
  id: string
  publicCode: string
  riskLevel: string
  status: string
}

export async function recordSensitiveCaseView({
  prisma,
  actor,
  caseRecord,
}: {
  prisma: AuditPrismaClient
  actor: Pick<AuthenticatedUser, 'id' | 'institutionId' | 'role'>
  caseRecord: SensitiveCaseForAudit
}) {
  return prisma.auditLog.create({
    data: {
      actorUserId: actor.id,
      actorInstitutionId: actor.institutionId,
      caseId: caseRecord.id,
      action: 'VIEW',
      entityType: 'Case',
      entityId: caseRecord.id,
      metadata: {
        publicCode: caseRecord.publicCode,
        riskLevel: caseRecord.riskLevel,
        status: caseRecord.status,
      },
    },
  })
}
