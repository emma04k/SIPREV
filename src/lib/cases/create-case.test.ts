import { describe, expect, it } from 'vitest'

import type { AuthenticatedUser } from '@/lib/auth/credentials'

import type { CreateCaseInput } from './case-input'
import { CaseCreationAuthorizationError, createCase, userCanCreateCase, type CaseCreationPrismaClient } from './create-case'

const validInput: CreateCaseInput = {
  caseType: 'INITIAL_REPORT',
  violenceTypes: ['PHYSICAL', 'PSYCHOLOGICAL'],
  riskLevel: 'HIGH',
  nonSensitiveSummary: 'Resumen sintético sin nombres, teléfonos ni datos reales.',
  protectedPerson: {
    demoFullName: 'Persona Demo Registro',
    demoDocumentNumber: 'DEMO-DOC-1234',
    demoBirthYear: 1992,
    demoContactNote: 'Contacto ficticio para coordinación demo.',
    demoLocationNote: 'Barrio sintético, sin dirección real.',
  },
  aggressorReference: {
    demoAlias: 'Referencia Demo',
    relationshipToCase: 'Relación sintética',
    triageContext: 'Contexto inicial ficticio.',
  },
  initialEvent: {
    title: 'Recepción inicial demo',
    detail: 'Se recibe caso sintético para triage protegido.',
  },
}

function actor(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 'user-session-id',
    email: 'case.worker@siprev.local',
    displayName: 'Case Worker Demo',
    role: 'CASE_WORKER',
    status: 'ACTIVE',
    institutionId: 'institution-session-id',
    institutionCode: 'COMISARIA-DEMO-NORTE',
    institutionStatus: 'ACTIVE',
    ...overrides,
  }
}

type FakeState = {
  cases: unknown[]
  protectedPersons: unknown[]
  aggressorReferences: unknown[]
  events: unknown[]
  assignments: unknown[]
  audits: unknown[]
}

type FailOperation = 'case.create' | 'protectedPerson.create' | 'aggressorReference.create' | 'caseEvent.create' | 'caseAssignment.create' | 'auditLog.create'

function makePrismaStub(failOperation?: FailOperation) {
  const state: FakeState = {
    cases: [],
    protectedPersons: [],
    aggressorReferences: [],
    events: [],
    assignments: [],
    audits: [],
  }

  function maybeFail(operation: FailOperation) {
    if (failOperation === operation) {
      throw new Error(`${operation} failed`)
    }
  }

  const tx = {
    case: {
      async create(args: { data: Record<string, unknown> }) {
        maybeFail('case.create')
        const record = { id: 'created-case-id', status: 'OPEN', ...args.data }
        state.cases.push(record)
        return record
      },
    },
    protectedPerson: {
      async create(args: { data: Record<string, unknown> }) {
        maybeFail('protectedPerson.create')
        state.protectedPersons.push(args.data)
        return { id: 'protected-person-id', ...args.data }
      },
    },
    aggressorReference: {
      async create(args: { data: Record<string, unknown> }) {
        maybeFail('aggressorReference.create')
        state.aggressorReferences.push(args.data)
        return { id: 'aggressor-reference-id', ...args.data }
      },
    },
    caseEvent: {
      async create(args: { data: Record<string, unknown> }) {
        maybeFail('caseEvent.create')
        state.events.push(args.data)
        return { id: 'event-id', ...args.data }
      },
    },
    caseAssignment: {
      async create(args: { data: Record<string, unknown> }) {
        maybeFail('caseAssignment.create')
        state.assignments.push(args.data)
        return { id: 'assignment-id', ...args.data }
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
      async $transaction<T>(callback: (transactionClient: typeof tx) => Promise<T>): Promise<T> {
        const snapshot = structuredClone(state)
        try {
          return await callback(tx)
        } catch (error) {
          state.cases = snapshot.cases
          state.protectedPersons = snapshot.protectedPersons
          state.aggressorReferences = snapshot.aggressorReferences
          state.events = snapshot.events
          state.assignments = snapshot.assignments
          state.audits = snapshot.audits
          throw error
        }
      },
    } as CaseCreationPrismaClient,
  }
}

describe('userCanCreateCase', () => {
  it.each(['SYSTEM_ADMIN', 'INSTITUTION_ADMIN', 'CASE_WORKER', 'PROSECUTOR'] as const)(
    'allows active %s users in active institutions to create protected cases',
    (role) => {
      expect(userCanCreateCase(actor({ role }))).toBe(true)
    },
  )

  it('rejects auditors, inactive users, and inactive institutions', () => {
    expect(userCanCreateCase(actor({ role: 'AUDITOR' }))).toBe(false)
    expect(userCanCreateCase(actor({ status: 'SUSPENDED' }))).toBe(false)
    expect(userCanCreateCase(actor({ institutionStatus: 'INACTIVE' }))).toBe(false)
  })
})

describe('createCase', () => {
  it('derives case ownership and assignment from the authenticated actor instead of client input', async () => {
    const { client, state } = makePrismaStub()
    const inputWithClientOwnedFields = {
      ...validInput,
      createdByUserId: 'client-user-id',
      reportingInstitutionId: 'client-reporting-inst',
      currentInstitutionId: 'client-current-inst',
      publicCode: 'SIPREV-CLIENT-CODE',
    } as CreateCaseInput

    await createCase({
      prisma: client,
      actor: actor(),
      input: inputWithClientOwnedFields,
      generatePublicCode: () => 'SIPREV-2026-000001',
    })

    expect(state.cases[0]).toMatchObject({
      createdByUserId: 'user-session-id',
      reportingInstitutionId: 'institution-session-id',
      currentInstitutionId: 'institution-session-id',
      publicCode: 'SIPREV-2026-000001',
    })
    expect(state.assignments[0]).toMatchObject({
      institutionId: 'institution-session-id',
      assignedUserId: 'user-session-id',
      status: 'ACTIVE',
    })
  })

  it('persists the case graph and CREATE audit metadata in one transaction without sensitive person data in the audit', async () => {
    const { client, state } = makePrismaStub()

    const result = await createCase({
      prisma: client,
      actor: actor(),
      input: validInput,
      generatePublicCode: () => 'SIPREV-2026-000002',
    })

    expect(result).toEqual({
      publicCode: 'SIPREV-2026-000002',
      caseType: 'INITIAL_REPORT',
      riskLevel: 'HIGH',
      status: 'OPEN',
    })
    expect(state.cases).toHaveLength(1)
    expect(state.protectedPersons).toHaveLength(1)
    expect(state.aggressorReferences).toHaveLength(1)
    expect(state.events[0]).toMatchObject({
      caseId: 'created-case-id',
      category: 'INTAKE',
      title: validInput.initialEvent.title,
      actorUserId: 'user-session-id',
      institutionId: 'institution-session-id',
    })
    expect(state.assignments).toHaveLength(1)
    expect(state.audits[0]).toMatchObject({
      actorUserId: 'user-session-id',
      actorInstitutionId: 'institution-session-id',
      caseId: 'created-case-id',
      action: 'CREATE',
      entityType: 'Case',
      entityId: 'created-case-id',
      metadata: {
        publicCode: 'SIPREV-2026-000002',
        riskLevel: 'HIGH',
        status: 'OPEN',
      },
    })
    expect(JSON.stringify(state.audits[0])).not.toContain(validInput.protectedPerson.demoFullName)
    expect(JSON.stringify(state.audits[0])).not.toContain(validInput.protectedPerson.demoDocumentNumber)
  })

  it('omits optional aggressor reference when no synthetic reference is provided', async () => {
    const { client, state } = makePrismaStub()

    await createCase({
      prisma: client,
      actor: actor(),
      input: { ...validInput, aggressorReference: undefined },
      generatePublicCode: () => 'SIPREV-2026-000003',
    })

    expect(state.aggressorReferences).toHaveLength(0)
  })

  it.each(['caseEvent.create', 'auditLog.create'] as const)(
    'fails closed without partial records when %s fails',
    async (failOperation) => {
      const { client, state } = makePrismaStub(failOperation)

      await expect(
        createCase({
          prisma: client,
          actor: actor(),
          input: validInput,
          generatePublicCode: () => 'SIPREV-2026-000004',
        }),
      ).rejects.toThrow(`${failOperation} failed`)

      expect(state.cases).toHaveLength(0)
      expect(state.protectedPersons).toHaveLength(0)
      expect(state.aggressorReferences).toHaveLength(0)
      expect(state.events).toHaveLength(0)
      expect(state.assignments).toHaveLength(0)
      expect(state.audits).toHaveLength(0)
    },
  )

  it('rejects unauthorized actors before any write and never exposes password or token fields in the result', async () => {
    const { client, state } = makePrismaStub()

    await expect(
      createCase({
        prisma: client,
        actor: actor({ role: 'AUDITOR' }),
        input: validInput,
        generatePublicCode: () => 'SIPREV-2026-000005',
      }),
    ).rejects.toBeInstanceOf(CaseCreationAuthorizationError)

    expect(state.cases).toHaveLength(0)

    const allowed = await createCase({
      prisma: client,
      actor: { ...actor(), passwordHash: 'secret', sessionToken: 'token' } as AuthenticatedUser,
      input: validInput,
      generatePublicCode: () => 'SIPREV-2026-000006',
    })

    expect(JSON.stringify(allowed)).not.toMatch(/password|token|secret/i)
  })
})
