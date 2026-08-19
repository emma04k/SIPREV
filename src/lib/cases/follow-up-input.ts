import { z } from 'zod'

const caseEventCategoryValues = ['FOLLOW_UP', 'RISK_REVIEW', 'REFERRAL', 'STATUS_CHANGE'] as const
const caseStatusValues = ['OPEN', 'IN_FOLLOW_UP', 'REFERRED', 'CLOSED'] as const
const followUpAllowedKeys = ['category', 'title', 'detail', 'newStatus'] as const

const requiredText = (max: number) => z.string().trim().min(1).max(max)

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

export const followUpInputSchema = z
  .object({
    category: z.enum(caseEventCategoryValues),
    title: requiredText(120),
    detail: requiredText(1000),
    newStatus: z.enum(caseStatusValues).optional(),
  })
  .passthrough()
  .superRefine(rejectUnexpectedKeys(followUpAllowedKeys))
  .transform(({ category, title, detail, newStatus }) => ({ category, title, detail, newStatus }))

export type FollowUpInput = z.infer<typeof followUpInputSchema>

export function parseFollowUpInput(input: unknown): FollowUpInput {
  return followUpInputSchema.parse(input)
}
