import { describe, expect, it } from 'vitest'

import { createCaseInputSchema, parseCreateCaseInput } from './case-input'

const validInput = {
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
} as const

describe('createCaseInputSchema', () => {
  it('accepts valid synthetic triage fields and trims free text', () => {
    const parsed = parseCreateCaseInput({
      ...validInput,
      nonSensitiveSummary: `  ${validInput.nonSensitiveSummary}  `,
    })

    expect(parsed.nonSensitiveSummary).toBe(validInput.nonSensitiveSummary)
    expect(parsed.protectedPerson.demoFullName).toBe('Persona Demo Registro')
  })

  it('rejects missing required triage fields and invalid enum values', () => {
    const result = createCaseInputSchema.safeParse({
      caseType: 'PUBLIC_WEB_FORM',
      violenceTypes: ['PHYSICAL', 'INVALID_KIND'],
      riskLevel: 'URGENT',
      nonSensitiveSummary: '',
      protectedPerson: {
        demoFullName: '',
        demoDocumentNumber: '',
      },
      initialEvent: {
        title: '',
        detail: '',
      },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join('.'))).toEqual(
        expect.arrayContaining([
          'caseType',
          'violenceTypes.1',
          'riskLevel',
          'nonSensitiveSummary',
          'protectedPerson.demoFullName',
          'protectedPerson.demoDocumentNumber',
          'initialEvent.title',
          'initialEvent.detail',
        ]),
      )
    }
  })

  it('rejects client-owned ids and publicCode fields at every boundary', () => {
    const result = createCaseInputSchema.safeParse({
      ...validInput,
      id: 'client-case-id',
      publicCode: 'SIPREV-CLIENT-CODE',
      createdByUserId: 'client-user-id',
      reportingInstitutionId: 'client-reporting-inst',
      currentInstitutionId: 'client-current-inst',
      protectedPerson: {
        ...validInput.protectedPerson,
        id: 'client-person-id',
        caseId: 'client-case-id',
      },
      aggressorReference: {
        ...validInput.aggressorReference,
        id: 'client-aggressor-id',
        caseId: 'client-case-id',
      },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join('.'))).toEqual(
        expect.arrayContaining([
          'id',
          'publicCode',
          'createdByUserId',
          'reportingInstitutionId',
          'currentInstitutionId',
          'protectedPerson.id',
          'protectedPerson.caseId',
          'aggressorReference.id',
          'aggressorReference.caseId',
        ]),
      )
    }
  })

  it('rejects overlong free-text fields', () => {
    const tooLong = 'x'.repeat(1_501)
    const result = createCaseInputSchema.safeParse({
      ...validInput,
      nonSensitiveSummary: tooLong,
      protectedPerson: {
        ...validInput.protectedPerson,
        demoContactNote: tooLong,
      },
      aggressorReference: {
        ...validInput.aggressorReference,
        triageContext: tooLong,
      },
      initialEvent: {
        title: 'x'.repeat(121),
        detail: tooLong,
      },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join('.'))).toEqual(
        expect.arrayContaining([
          'nonSensitiveSummary',
          'protectedPerson.demoContactNote',
          'aggressorReference.triageContext',
          'initialEvent.title',
          'initialEvent.detail',
        ]),
      )
    }
  })
})
