import { z } from 'zod'

const caseTypeValues = ['INITIAL_REPORT', 'POLICE_REPORT', 'PROSECUTOR_REFERRAL'] as const
const violenceTypeValues = ['PHYSICAL', 'PSYCHOLOGICAL', 'SEXUAL', 'ECONOMIC', 'DIGITAL', 'INSTITUTIONAL'] as const
const riskLevelValues = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const

const requiredText = (max: number) => z.string().trim().min(1).max(max)
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === '' ? undefined : value))

function rejectUnexpectedKeys(allowedKeys: readonly string[]) {
  return (value: Record<string, unknown>, ctx: z.RefinementCtx) => {
    const allowed = new Set(allowedKeys)

    for (const key of Object.keys(value)) {
      if (!allowed.has(key)) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: 'Client-owned or unexpected fields are not accepted',
        })
      }
    }
  }
}

const protectedPersonAllowedKeys = [
  'demoFullName',
  'demoDocumentNumber',
  'demoBirthYear',
  'demoContactNote',
  'demoLocationNote',
] as const

const protectedPersonSchema = z
  .object({
    demoFullName: requiredText(160),
    demoDocumentNumber: requiredText(80),
    demoBirthYear: z.number().int().min(1900).max(new Date().getUTCFullYear()).optional(),
    demoContactNote: optionalText(500),
    demoLocationNote: optionalText(500),
  })
  .passthrough()
  .superRefine(rejectUnexpectedKeys(protectedPersonAllowedKeys))
  .transform(({ demoFullName, demoDocumentNumber, demoBirthYear, demoContactNote, demoLocationNote }) => ({
    demoFullName,
    demoDocumentNumber,
    demoBirthYear,
    demoContactNote,
    demoLocationNote,
  }))

const aggressorReferenceAllowedKeys = ['demoAlias', 'relationshipToCase', 'triageContext'] as const

const aggressorReferenceSchema = z
  .object({
    demoAlias: requiredText(160),
    relationshipToCase: optionalText(160),
    triageContext: optionalText(500),
  })
  .passthrough()
  .superRefine(rejectUnexpectedKeys(aggressorReferenceAllowedKeys))
  .transform(({ demoAlias, relationshipToCase, triageContext }) => ({
    demoAlias,
    relationshipToCase,
    triageContext,
  }))

const initialEventAllowedKeys = ['title', 'detail'] as const

const initialEventSchema = z
  .object({
    title: requiredText(120),
    detail: requiredText(500),
  })
  .passthrough()
  .superRefine(rejectUnexpectedKeys(initialEventAllowedKeys))
  .transform(({ title, detail }) => ({ title, detail }))

const createCaseAllowedKeys = [
  'caseType',
  'violenceTypes',
  'riskLevel',
  'nonSensitiveSummary',
  'protectedPerson',
  'aggressorReference',
  'initialEvent',
] as const

export const createCaseInputSchema = z
  .object({
    caseType: z.enum(caseTypeValues),
    violenceTypes: z.array(z.enum(violenceTypeValues)).min(1).max(violenceTypeValues.length),
    riskLevel: z.enum(riskLevelValues),
    nonSensitiveSummary: requiredText(500),
    protectedPerson: protectedPersonSchema,
    aggressorReference: aggressorReferenceSchema.optional(),
    initialEvent: initialEventSchema,
  })
  .passthrough()
  .superRefine(rejectUnexpectedKeys(createCaseAllowedKeys))
  .transform(
    ({ caseType, violenceTypes, riskLevel, nonSensitiveSummary, protectedPerson, aggressorReference, initialEvent }) => ({
      caseType,
      violenceTypes,
      riskLevel,
      nonSensitiveSummary,
      protectedPerson,
      aggressorReference,
      initialEvent,
    }),
  )

export type CreateCaseInput = z.infer<typeof createCaseInputSchema>

export function parseCreateCaseInput(input: unknown): CreateCaseInput {
  return createCaseInputSchema.parse(input)
}
