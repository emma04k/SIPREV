import { describe, expect, it } from 'vitest'

import type { AuthenticatedUser } from '@/lib/auth/credentials'
import type { FollowUpInput } from './follow-up-input'
import {
  CaseFollowUpAuthorizationError,
  CaseFollowUpNotFoundError,
  createCaseFollowUp,
  type CaseFollowUpPrismaClient,
} from './create-follow-up'

const actor: AuthenticatedUser = {
  id: 'demo-user-comisaria',
  email: 'comisaria.demo@siprev.local',
  displayName: 'Operadora Demo Comisaría',
  role: 'CASE_WORKER',
  status: 'ACTIVE',
  institutionId: 'demo-inst-comisaria-norte',
  institutionCode: 'COMISARIA-DEMO-NORTE',
  institutionStatus: 'ACTIVE',
}

const caseRecord = {
  id: 'demo-case-001',
  publicCode: 'SIPREV-DEMO-CASE-001',
  riskLevel: 'HIGH',
  status: 'OPEN',
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

const input: FollowUpInput = {
  category: 'FOLLOW_UP',
  title: 'Seguimiento demo autorizado',
  detail: 'Nota sintética de seguimiento sin datos reales.',
  newStatus: 'IN_FOLLOW_UP',
}

function makePrismaStub({
  caseOverride = {},
  failOperation,
}: {
  caseOverride?: Partial<typeof caseRecord> | null
  failOperation?: 'case.update' | 'caseEvent.create' | 'auditLog.create'
} = {}) {
  const state = {
    updates: [] as unknown[],
    events: [] as unknown[],
    audits: [] as unknown[],
    transactions: 0,
  }
  const foundCase = caseOverride === null ? null : { ...caseRecord, ...caseOverride }

  function maybeFail(operation: typeof failOperation) {
    if (failOperation === operation) {
      throw new Error(`${operation} failed`)
    }
  }

  const tx = {
    case: {
      async update(args: { where: unknown; data: unknown }) {
        maybeFail('case.update')
        state.updates.push(args)
        return { ...foundCase, ...(args.data as object) }
      },
    },
    caseEvent: {
      async create(args: { data: Record<string, unknown> }) {
        maybeFail('caseEvent.create')
        state.events.push(args.data)
        return { id: 'event-id', ...args.data }
      },
    },
    auditLog: {
      async create(args: { data: Record<string, unknown> }) {
        maybeFail('auditLog.create')
        state.audits.push(args.data)
        return { id: 'audit-id', ...args.data }
      },
    },
  }

  return {
    state,
    client: {
      case: {
        async findUnique() {
          return foundCase
        },
      },
      async $transaction<T>(callback: (transactionClient: typeof tx) => Promise<T>): Promise<T> {
        state.transactions += 1
        const snapshot = structuredClone(state)
        try {
          return await callback(tx)
        } catch (error) {
          state.updates = snapshot.updates
          state.events = snapshot.events
          state.audits = snapshot.audits
          throw error
        }
      },
    } as CaseFollowUpPrismaClient,
  }
}

describe('createCaseFollowUp', () => {
  it('looks up the route public code, verifies case access before writing, and rejects missing cases', async () => {
    const missing = makePrismaStub({ caseOverride: null })

    await expect(
      createCaseFollowUp({ prisma: missing.client, actor, publicCode: 'SIPREV-MISSING', input }),
    ).rejects.toBeInstanceOf(CaseFollowUpNotFoundError)
    expect(missing.state.transactions).toBe(0)

    const unauthorized = makePrismaStub({
      caseOverride: {
        reportingInstitutionId: 'other-inst',
        currentInstitutionId: 'other-inst',
        assignments: [],
      },
    })

    await expect(
      createCaseFollowUp({ prisma: unauthorized.client, actor, publicCode: 'SIPREV-DEMO-CASE-001', input }),
    ).rejects.toBeInstanceOf(CaseFollowUpAuthorizationError)
    expect(unauthorized.state.transactions).toBe(0)
  })

  it('rejects AUDITOR read access before creating events or status updates', async () => {
    const auditorWithReadAccess: AuthenticatedUser = {
      ...actor,
      id: 'demo-user-auditor',
      email: 'auditor.demo@siprev.local',
      displayName: 'Auditoría Demo',
      role: 'AUDITOR',
      institutionId: 'demo-inst-auditoria',
      institutionCode: 'AUDITORIA-DEMO',
    }
    const { client, state } = makePrismaStub({
      caseOverride: {
        reportingInstitutionId: 'unrelated-reporting-inst',
        currentInstitutionId: 'unrelated-current-inst',
        assignments: [],
      },
    })

    await expect(
      createCaseFollowUp({ prisma: client, actor: auditorWithReadAccess, publicCode: 'SIPREV-DEMO-CASE-001', input }),
    ).rejects.toBeInstanceOf(CaseFollowUpAuthorizationError)

    expect(state.transactions).toBe(0)
    expect(state.updates).toHaveLength(0)
    expect(state.events).toHaveLength(0)
    expect(state.audits).toHaveLength(0)
  })

  it.each([
    {
      role: 'CASE_WORKER' as const,
      authorizedActor: actor,
      caseOverride: {},
    },
    {
      role: 'PROSECUTOR' as const,
      authorizedActor: {
        ...actor,
        id: 'demo-user-fiscalia',
        email: 'fiscalia.demo@siprev.local',
        displayName: 'Fiscal Demo Control',
        role: 'PROSECUTOR' as const,
        institutionId: 'demo-inst-fiscalia-control',
        institutionCode: 'FISCALIA-DEMO-CONTROL',
      },
      caseOverride: {
        currentInstitutionId: 'demo-inst-fiscalia-control',
        assignments: [
          {
            institutionId: 'demo-inst-fiscalia-control',
            assignedUserId: 'demo-user-fiscalia',
            status: 'ACTIVE' as const,
          },
        ],
      },
    },
  ])('allows %s to create follow-up events when case access policy allows it', async ({ authorizedActor, caseOverride }) => {
    const { client, state } = makePrismaStub({ caseOverride })

    const result = await createCaseFollowUp({ prisma: client, actor: authorizedActor, publicCode: 'SIPREV-DEMO-CASE-001', input })

    expect(result.status).toBe('IN_FOLLOW_UP')
    expect(state.transactions).toBe(1)
    expect(state.events).toHaveLength(1)
    expect(state.audits).toHaveLength(1)
  })

  it('creates follow-up event, status update and UPDATE audit in one transaction using actor-owned ids only', async () => {
    const { client, state } = makePrismaStub()

    const result = await createCaseFollowUp({ prisma: client, actor, publicCode: 'SIPREV-DEMO-CASE-001', input })

    expect(result).toEqual({
      publicCode: 'SIPREV-DEMO-CASE-001',
      event: { category: 'FOLLOW_UP', title: 'Seguimiento demo autorizado' },
      status: 'IN_FOLLOW_UP',
    })
    expect(state.updates[0]).toEqual({
      where: { id: 'demo-case-001' },
      data: { status: 'IN_FOLLOW_UP', closedAt: null },
    })
    expect(state.events[0]).toMatchObject({
      caseId: 'demo-case-001',
      category: 'FOLLOW_UP',
      title: input.title,
      detail: input.detail,
      actorUserId: actor.id,
      institutionId: actor.institutionId,
    })
    expect(state.audits[0]).toMatchObject({
      actorUserId: actor.id,
      actorInstitutionId: actor.institutionId,
      caseId: 'demo-case-001',
      action: 'UPDATE',
      entityType: 'Case',
      entityId: 'demo-case-001',
      metadata: {
        publicCode: 'SIPREV-DEMO-CASE-001',
        eventCategory: 'FOLLOW_UP',
        previousStatus: 'OPEN',
        newStatus: 'IN_FOLLOW_UP',
        statusChanged: true,
      },
    })
    expect(JSON.stringify(state.audits[0])).not.toContain(input.detail)
    expect(JSON.stringify(state.audits[0])).not.toMatch(/Persona Demo|DEMO-DOC|demoFullName|demoDocumentNumber/i)
  })

  it('rolls back event and status writes when audit recording fails', async () => {
    const { client, state } = makePrismaStub({ failOperation: 'auditLog.create' })

    await expect(
      createCaseFollowUp({ prisma: client, actor, publicCode: 'SIPREV-DEMO-CASE-001', input }),
    ).rejects.toThrow('auditLog.create failed')

    expect(state.updates).toHaveLength(0)
    expect(state.events).toHaveLength(0)
    expect(state.audits).toHaveLength(0)
  })
})
