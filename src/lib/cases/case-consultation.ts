import type { Prisma } from '@prisma/client'
import { z } from 'zod'

import type { AuthenticatedUser } from '@/lib/auth/credentials'
import { authorizedCasesWhereForUser } from './case-access-query'

const caseStatusValues = ['OPEN', 'IN_FOLLOW_UP', 'REFERRED', 'CLOSED'] as const
const caseRiskLevelValues = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
const caseTypeValues = ['INITIAL_REPORT', 'POLICE_REPORT', 'PROSECUTOR_REFERRAL'] as const

const rawFiltersSchema = z.object({
  status: z.enum(caseStatusValues).optional(),
  riskLevel: z.enum(caseRiskLevelValues).optional(),
  caseType: z.enum(caseTypeValues).optional(),
  q: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
})

export type CaseListFilters = Partial<{
  status: (typeof caseStatusValues)[number]
  riskLevel: (typeof caseRiskLevelValues)[number]
  caseType: (typeof caseTypeValues)[number]
  q: string
}>

export type CaseListItem = {
  publicCode: string
  caseType: string
  riskLevel: string
  status: string
  nonSensitiveSummary: string
  createdAt: Date
  updatedAt: Date
}

type CaseListPrismaClient = {
  case: {
    findMany(args: Prisma.CaseFindManyArgs): Promise<CaseListItem[]>
  }
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

export function parseCaseListFilters(raw: Record<string, string | string[] | undefined>): CaseListFilters {
  const candidate = {
    status: firstSearchParam(raw.status),
    riskLevel: firstSearchParam(raw.riskLevel),
    caseType: firstSearchParam(raw.caseType),
    q: firstSearchParam(raw.q),
  }
  const parsed = rawFiltersSchema.safeParse(candidate)

  if (parsed.success) {
    return Object.fromEntries(Object.entries(parsed.data).filter(([, value]) => value !== undefined)) as CaseListFilters
  }

  const sanitized: CaseListFilters = {}

  if (candidate.status && caseStatusValues.includes(candidate.status as (typeof caseStatusValues)[number])) {
    sanitized.status = candidate.status as CaseListFilters['status']
  }

  if (candidate.riskLevel && caseRiskLevelValues.includes(candidate.riskLevel as (typeof caseRiskLevelValues)[number])) {
    sanitized.riskLevel = candidate.riskLevel as CaseListFilters['riskLevel']
  }

  if (candidate.caseType && caseTypeValues.includes(candidate.caseType as (typeof caseTypeValues)[number])) {
    sanitized.caseType = candidate.caseType as CaseListFilters['caseType']
  }

  if (candidate.q && candidate.q.trim().length <= 80) {
    sanitized.q = candidate.q.trim()
  }

  return sanitized
}

function combineWhere(authorizedWhere: Prisma.CaseWhereInput | undefined | null, filters: CaseListFilters): Prisma.CaseWhereInput | undefined {
  if (authorizedWhere === null) {
    return { id: '__siprev_no_authorized_cases__' }
  }

  const clauses: Prisma.CaseWhereInput[] = []

  if (authorizedWhere !== undefined) {
    clauses.push(authorizedWhere)
  }

  if (filters.status) {
    clauses.push({ status: filters.status })
  }

  if (filters.riskLevel) {
    clauses.push({ riskLevel: filters.riskLevel })
  }

  if (filters.caseType) {
    clauses.push({ caseType: filters.caseType })
  }

  if (filters.q) {
    clauses.push({
      OR: [
        { publicCode: { contains: filters.q, mode: 'insensitive' } },
        { nonSensitiveSummary: { contains: filters.q, mode: 'insensitive' } },
      ],
    })
  }

  if (clauses.length === 0) {
    return undefined
  }

  if (clauses.length === 1) {
    return clauses[0]
  }

  return { AND: clauses }
}

export function buildAuthorizedCaseListQuery(
  user: AuthenticatedUser,
  filters: CaseListFilters,
): Prisma.CaseFindManyArgs {
  const authorizedWhere = authorizedCasesWhereForUser(user) as Prisma.CaseWhereInput | undefined | null

  return {
    where: combineWhere(authorizedWhere, filters),
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      publicCode: true,
      caseType: true,
      riskLevel: true,
      status: true,
      nonSensitiveSummary: true,
      createdAt: true,
      updatedAt: true,
    },
  }
}

export async function listAuthorizedCases({
  prisma,
  user,
  filters,
}: {
  prisma: CaseListPrismaClient
  user: AuthenticatedUser
  filters: CaseListFilters
}): Promise<CaseListItem[]> {
  return prisma.case.findMany(buildAuthorizedCaseListQuery(user, filters))
}
