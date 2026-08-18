import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthenticationRequiredError } from '@/lib/auth/current-user'

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  userCanCreateCase: vi.fn(),
  createCase: vi.fn(),
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

vi.mock('@/lib/cases/create-case', () => {
  class CaseCreationAuthorizationError extends Error {
    readonly status = 403

    constructor(message = 'The authenticated user cannot create protected cases') {
      super(message)
      this.name = 'CaseCreationAuthorizationError'
    }
  }

  return {
    CaseCreationAuthorizationError,
    createCase: mocks.createCase,
    userCanCreateCase: mocks.userCanCreateCase,
  }
})

vi.mock('@/lib/prisma', () => ({
  prisma: { $transaction: vi.fn() },
}))

import { POST } from './route'

const actor = {
  id: 'user-session-id',
  email: 'case.worker@siprev.local',
  displayName: 'Case Worker Demo',
  role: 'CASE_WORKER' as const,
  status: 'ACTIVE' as const,
  institutionId: 'institution-session-id',
  institutionCode: 'COMISARIA-DEMO-NORTE',
  institutionStatus: 'ACTIVE' as const,
}

const validBody = {
  caseType: 'INITIAL_REPORT',
  violenceTypes: ['PHYSICAL'],
  riskLevel: 'HIGH',
  nonSensitiveSummary: 'Resumen sintético sin nombres ni datos reales.',
  protectedPerson: {
    demoFullName: 'Persona Demo Registro',
    demoDocumentNumber: 'DEMO-DOC-1234',
    demoBirthYear: 1992,
  },
  initialEvent: {
    title: 'Recepción inicial demo',
    detail: 'Se recibe caso sintético para triage protegido.',
  },
}

function postJson(body: unknown) {
  return POST(
    new Request('http://localhost/api/cases', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }),
  )
}

describe('POST /api/cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireUser.mockResolvedValue(actor)
    mocks.userCanCreateCase.mockReturnValue(true)
    mocks.createCase.mockResolvedValue({
      publicCode: 'SIPREV-2026-ABC12345',
      caseType: 'INITIAL_REPORT',
      riskLevel: 'HIGH',
      status: 'OPEN',
    })
  })

  it('returns 401 before parsing or writing when unauthenticated', async () => {
    mocks.requireUser.mockRejectedValue(new AuthenticationRequiredError())

    const response = await postJson(validBody)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'No autenticado' })
    expect(mocks.userCanCreateCase).not.toHaveBeenCalled()
    expect(mocks.createCase).not.toHaveBeenCalled()
  })

  it('returns 403 for authenticated users without create permission', async () => {
    mocks.userCanCreateCase.mockReturnValue(false)

    const response = await postJson(validBody)

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'No autorizado para registrar casos' })
    expect(mocks.userCanCreateCase).toHaveBeenCalledWith(actor)
    expect(mocks.createCase).not.toHaveBeenCalled()
  })

  it('returns 400 and does not write for validation failures or client-owned ids', async () => {
    const response = await postJson({
      ...validBody,
      caseType: 'PUBLIC_WEB_FORM',
      publicCode: 'SIPREV-CLIENT-CODE',
      createdByUserId: 'client-user-id',
      protectedPerson: {
        ...validBody.protectedPerson,
        id: 'client-person-id',
        demoFullName: '',
      },
    })

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Solicitud inválida')
    expect(json.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'caseType' }),
        expect.objectContaining({ field: 'publicCode' }),
        expect.objectContaining({ field: 'createdByUserId' }),
        expect.objectContaining({ field: 'protectedPerson.id' }),
        expect.objectContaining({ field: 'protectedPerson.demoFullName' }),
      ]),
    )
    expect(mocks.createCase).not.toHaveBeenCalled()
  })

  it('returns 201 with a safe app-owned response for successful creation', async () => {
    const response = await postJson(validBody)

    expect(response.status).toBe(201)
    const json = await response.json()
    expect(json).toEqual({
      case: {
        publicCode: 'SIPREV-2026-ABC12345',
        caseType: 'INITIAL_REPORT',
        riskLevel: 'HIGH',
        status: 'OPEN',
      },
    })
    expect(mocks.createCase).toHaveBeenCalledWith(
      expect.objectContaining({
        actor,
        input: expect.objectContaining({ nonSensitiveSummary: validBody.nonSensitiveSummary }),
      }),
    )
    expect(JSON.stringify(json)).not.toMatch(/password|token|session/i)
  })

  it('fails closed with a generic 500 response when creation, event, or audit transaction fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.createCase.mockRejectedValue(new Error('auditLog.create failed'))

    const response = await postJson(validBody)

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'No fue posible registrar el caso' })
    expect(consoleError).toHaveBeenCalledWith('Failed to create protected case', expect.any(Error))
    consoleError.mockRestore()
  })
})
