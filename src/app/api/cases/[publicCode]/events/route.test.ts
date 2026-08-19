import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  findUnique: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('@/lib/auth/current-user', () => {
  class AuthenticationRequiredError extends Error {
    readonly status = 401

    constructor(message = 'Authentication required') {
      super(message)
      this.name = 'AuthenticationRequiredError'
    }
  }

  return {
    AuthenticationRequiredError,
    requireUser: mocks.requireUser,
  }
})

vi.mock('@/lib/prisma', () => ({
  prisma: {
    case: { findUnique: mocks.findUnique },
    $transaction: mocks.transaction,
  },
}))

import { AuthenticationRequiredError } from '@/lib/auth/current-user'
import { POST } from './route'

const actor = {
  id: 'demo-user-comisaria',
  email: 'comisaria.demo@siprev.local',
  displayName: 'Operadora Demo Comisaría',
  role: 'CASE_WORKER' as const,
  status: 'ACTIVE' as const,
  institutionId: 'demo-inst-comisaria-norte',
  institutionCode: 'COMISARIA-DEMO-NORTE',
  institutionStatus: 'ACTIVE' as const,
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

const validBody = {
  category: 'FOLLOW_UP',
  title: 'Seguimiento demo autorizado',
  detail: 'Nota sintética de seguimiento sin datos reales.',
  newStatus: 'IN_FOLLOW_UP',
}

type RoutePrismaState = {
  updates: unknown[]
  events: unknown[]
  audits: unknown[]
  transactions: number
}

type RouteCaseRecord = typeof caseRecord

function configurePrismaStub({
  caseOverride = {},
  failOperation,
}: {
  caseOverride?: Partial<RouteCaseRecord> | null
  failOperation?: 'case.update' | 'caseEvent.create' | 'auditLog.create'
} = {}) {
  const state: RoutePrismaState = {
    updates: [],
    events: [],
    audits: [],
    transactions: 0,
  }
  const foundCase = caseOverride === null ? null : { ...caseRecord, ...caseOverride }

  function maybeFail(operation: NonNullable<typeof failOperation>) {
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

  mocks.findUnique.mockResolvedValue(foundCase)
  mocks.transaction.mockImplementation(async (callback: (transactionClient: typeof tx) => Promise<unknown>) => {
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
  })

  return state
}

function postJson(body: unknown, publicCode = 'SIPREV-DEMO-CASE-001') {
  return POST(
    new Request(`http://localhost/api/cases/${publicCode}/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: { publicCode } },
  )
}

describe('POST /api/cases/[publicCode]/events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireUser.mockResolvedValue(actor)
    configurePrismaStub()
  })

  it('returns 401 before parsing or writing when unauthenticated', async () => {
    mocks.requireUser.mockRejectedValue(new AuthenticationRequiredError())

    const response = await postJson(validBody)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'No autenticado' })
    expect(mocks.findUnique).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('returns 403 when the authenticated actor cannot access the case', async () => {
    const state = configurePrismaStub({
      caseOverride: {
        reportingInstitutionId: 'other-inst',
        currentInstitutionId: 'other-inst',
        assignments: [],
      },
    })

    const response = await postJson(validBody)

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'No autorizado para modificar el caso' })
    expect(state.transactions).toBe(0)
    expect(state.events).toHaveLength(0)
  })

  it('returns 403 for an AUDITOR with read access and does not create a follow-up event', async () => {
    mocks.requireUser.mockResolvedValue({
      ...actor,
      id: 'demo-user-auditor',
      email: 'auditor.demo@siprev.local',
      displayName: 'Auditoría Demo',
      role: 'AUDITOR' as const,
      institutionId: 'demo-inst-auditoria',
      institutionCode: 'AUDITORIA-DEMO',
    })
    const state = configurePrismaStub({
      caseOverride: {
        reportingInstitutionId: 'unrelated-reporting-inst',
        currentInstitutionId: 'unrelated-current-inst',
        assignments: [],
      },
    })

    const response = await postJson(validBody)

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'No autorizado para modificar el caso' })
    expect(state.transactions).toBe(0)
    expect(state.updates).toHaveLength(0)
    expect(state.events).toHaveLength(0)
    expect(state.audits).toHaveLength(0)
  })

  it('returns 404 without writing when the public code is not found', async () => {
    const state = configurePrismaStub({ caseOverride: null })

    const response = await postJson(validBody, 'SIPREV-MISSING')

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Caso no encontrado' })
    expect(state.transactions).toBe(0)
  })

  it('returns 400 for validation failures and client-owned ids without writing', async () => {
    const response = await postJson({
      category: 'PUBLIC_NOTE',
      title: '',
      detail: 'x'.repeat(1_001),
      newStatus: 'DELETED',
      caseId: 'client-case-id',
      publicCode: 'SIPREV-CLIENT-CODE',
      actorUserId: 'client-user-id',
      actorInstitutionId: 'client-inst-id',
    })

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Solicitud inválida')
    expect(json.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'category' }),
        expect.objectContaining({ field: 'title' }),
        expect.objectContaining({ field: 'detail' }),
        expect.objectContaining({ field: 'newStatus' }),
        expect.objectContaining({ field: 'caseId' }),
        expect.objectContaining({ field: 'publicCode' }),
        expect.objectContaining({ field: 'actorUserId' }),
        expect.objectContaining({ field: 'actorInstitutionId' }),
      ]),
    )
    expect(mocks.findUnique).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('returns 201 with a safe event/status response for successful follow-up creation', async () => {
    const response = await postJson(validBody)

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      case: {
        publicCode: 'SIPREV-DEMO-CASE-001',
        event: { category: 'FOLLOW_UP', title: 'Seguimiento demo autorizado' },
        status: 'IN_FOLLOW_UP',
      },
    })
    expect(mocks.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { publicCode: 'SIPREV-DEMO-CASE-001' },
      }),
    )
  })

  it('fails closed with a generic 500 response when the transactional event/audit write fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    configurePrismaStub({ failOperation: 'auditLog.create' })

    const response = await postJson(validBody)

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'No fue posible registrar el seguimiento' })
    expect(consoleError).toHaveBeenCalledWith('Failed to create protected case follow-up', expect.any(Error))
    consoleError.mockRestore()
  })
})
