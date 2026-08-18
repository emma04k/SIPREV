import { describe, expect, it, vi } from 'vitest'

import { recordSensitiveCaseView } from './audit-log'

const actor = {
  id: 'demo-user-auditor',
  institutionId: 'demo-inst-auditoria',
  role: 'AUDITOR' as const,
}

const caseRecord = {
  id: 'demo-case-002',
  publicCode: 'SIPREV-DEMO-CASE-002',
  riskLevel: 'MEDIUM' as const,
  status: 'REFERRED' as const,
}

describe('Phase 3 sensitive case view audit helper', () => {
  it('creates a VIEW AuditLog preserving case entity metadata server-side', async () => {
    const create = vi.fn(async ({ data }) => ({ id: 'audit-created', ...data }))
    const prisma = { auditLog: { create } }

    const auditLog = await recordSensitiveCaseView({ prisma, actor, caseRecord })

    expect(create).toHaveBeenCalledWith({
      data: {
        actorUserId: 'demo-user-auditor',
        actorInstitutionId: 'demo-inst-auditoria',
        caseId: 'demo-case-002',
        action: 'VIEW',
        entityType: 'Case',
        entityId: 'demo-case-002',
        metadata: {
          publicCode: 'SIPREV-DEMO-CASE-002',
          riskLevel: 'MEDIUM',
          status: 'REFERRED',
        },
      },
    })
    expect(auditLog).toMatchObject({ id: 'audit-created', action: 'VIEW', entityType: 'Case' })
  })
})
