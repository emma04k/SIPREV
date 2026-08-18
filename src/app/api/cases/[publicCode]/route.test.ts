import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  canAccessCase: vi.fn(),
  recordSensitiveCaseView: vi.fn(),
  findUnique: vi.fn(),
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

vi.mock('@/lib/auth/permissions', () => ({
  canAccessCase: mocks.canAccessCase,
}))

vi.mock('@/lib/audit-log', () => ({
  recordSensitiveCaseView: mocks.recordSensitiveCaseView,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    case: {
      findUnique: mocks.findUnique,
    },
  },
}))

import { AuthenticationRequiredError } from '@/lib/auth/current-user'
import { GET } from './route'

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
  caseType: 'POLICE_REPORT',
  violenceTypes: ['PHYSICAL'],
  riskLevel: 'HIGH',
  status: 'IN_FOLLOW_UP',
  nonSensitiveSummary: 'Caso sintético autorizado.',
  reportingInstitutionId: 'demo-inst-comisaria-norte',
  currentInstitutionId: 'demo-inst-comisaria-norte',
  protectedPerson: {
    demoFullName: 'Persona Demo Uno',
    demoDocumentNumber: 'DEMO-DOC-0001',
    demoBirthYear: 1996,
    demoContactNote: 'Contacto ficticio.',
    demoLocationNote: 'Ubicación ficticia.',
  },
  assignments: [
    {
      institutionId: 'demo-inst-comisaria-norte',
      assignedUserId: 'demo-user-comisaria',
      status: 'ACTIVE' as const,
    },
  ],
  events: [
    {
      category: 'INTAKE',
      title: 'Registro inicial demo',
      detail: 'Ingreso sintético.',
      occurredAt: new Date('2026-03-01T10:00:00.000Z'),
      institutionId: 'demo-inst-comisaria-norte',
    },
  ],
}

async function callGet(publicCode = 'SIPREV-DEMO-CASE-001') {
  return GET(new Request(`http://localhost/api/cases/${publicCode}`), { params: { publicCode } })
}

describe('GET /api/cases/[publicCode]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireUser.mockResolvedValue(actor)
    mocks.findUnique.mockResolvedValue(caseRecord)
    mocks.canAccessCase.mockReturnValue(true)
    mocks.recordSensitiveCaseView.mockResolvedValue({ id: 'audit-log-id' })
  })

  it('returns 401 when the request is unauthenticated', async () => {
    mocks.requireUser.mockRejectedValue(new AuthenticationRequiredError())

    const response = await callGet()

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({ error: 'No autenticado' })
    expect(mocks.findUnique).not.toHaveBeenCalled()
  })

  it('returns 404 when the case does not exist', async () => {
    mocks.findUnique.mockResolvedValue(null)

    const response = await callGet('MISSING-CASE')

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({ error: 'Caso no encontrado' })
    expect(mocks.recordSensitiveCaseView).not.toHaveBeenCalled()
  })

  it('returns 403 when the authenticated user cannot access the case', async () => {
    mocks.canAccessCase.mockReturnValue(false)

    const response = await callGet()

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({ error: 'No autorizado' })
    expect(mocks.recordSensitiveCaseView).not.toHaveBeenCalled()
  })

  it('returns the authorized case and records a VIEW audit before responding', async () => {
    const response = await callGet()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      case: {
        publicCode: 'SIPREV-DEMO-CASE-001',
        protectedPerson: caseRecord.protectedPerson,
        events: [{ occurredAt: '2026-03-01T10:00:00.000Z' }],
      },
    })
    expect(mocks.canAccessCase).toHaveBeenCalledWith(actor, caseRecord)
    expect(mocks.recordSensitiveCaseView).toHaveBeenCalledWith(expect.objectContaining({ actor, caseRecord }))
  })

  it('fails closed with a generic 500 response when VIEW audit recording fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.recordSensitiveCaseView.mockRejectedValue(new Error('audit database unavailable'))

    const response = await callGet()

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({ error: 'No fue posible registrar la auditoría de acceso' })
    expect(consoleError).toHaveBeenCalledWith('Failed to record sensitive case VIEW audit', expect.any(Error))
    consoleError.mockRestore()
  })
})
