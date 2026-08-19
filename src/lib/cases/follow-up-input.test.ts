import { describe, expect, it } from 'vitest'

import { followUpInputSchema, parseFollowUpInput } from './follow-up-input'

const validInput = {
  category: 'FOLLOW_UP',
  title: 'Seguimiento demo autorizado',
  detail: 'Nota sintética de seguimiento sin datos reales ni información personal nueva.',
  newStatus: 'IN_FOLLOW_UP',
} as const

describe('Phase 5 follow-up input validation', () => {
  it('accepts and trims a synthetic follow-up with an optional valid status change', () => {
    const parsed = parseFollowUpInput({
      ...validInput,
      title: `  ${validInput.title}  `,
      detail: `  ${validInput.detail}  `,
    })

    expect(parsed).toEqual(validInput)
  })

  it('rejects missing or overlong text and invalid category/status values', () => {
    const result = followUpInputSchema.safeParse({
      category: 'PUBLIC_NOTE',
      title: '',
      detail: 'x'.repeat(1_001),
      newStatus: 'DELETED',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join('.'))).toEqual(
        expect.arrayContaining(['category', 'title', 'detail', 'newStatus']),
      )
    }
  })

  it('rejects client-owned ids, actor fields, institution fields and public code in the body', () => {
    const result = followUpInputSchema.safeParse({
      ...validInput,
      id: 'client-event-id',
      caseId: 'client-case-id',
      publicCode: 'SIPREV-CLIENT-CODE',
      userId: 'client-user-id',
      institutionId: 'client-institution-id',
      createdByUserId: 'client-created-by',
      actorUserId: 'client-actor-user',
      actorInstitutionId: 'client-actor-inst',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join('.'))).toEqual(
        expect.arrayContaining([
          'id',
          'caseId',
          'publicCode',
          'userId',
          'institutionId',
          'createdByUserId',
          'actorUserId',
          'actorInstitutionId',
        ]),
      )
    }
  })
})
