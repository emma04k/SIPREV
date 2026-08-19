import type { Prisma } from '@prisma/client'

import type { AuthenticatedUser } from '@/lib/auth/credentials'

const auditActionValues = ['CREATE', 'VIEW', 'UPDATE', 'ASSIGN', 'REFER', 'CLOSE', 'SEED'] as const
const MAX_AUDIT_ENTRIES = 100
const MAX_FILTER_LENGTH = 120

const exactSensitiveMetadataKeys = new Set([
  'detail',
  'demofullname',
  'demodocumentnumber',
  'democontactnote',
  'demolocationnote',
])

const highRiskSensitiveMetadataKeyFragments = [
  'password',
  'token',
  'session',
  'cookie',
  'authorization',
  'body',
]

const protectedPersonMetadataKeyFragments = [
  'protectedperson',
  'demofullname',
  'demodocumentnumber',
  'democontactnote',
  'demolocationnote',
]

export type AuditLogFilters = Partial<{
  action: (typeof auditActionValues)[number]
  entityType: string
  publicCode: string
  actor: string
}>

export type AuditLogEntry = {
  id: string
  action: string
  entityType: string
  entityId: string
  publicCode: string | null
  createdAt: string
  actor: string
  institution: string
  metadata: unknown
}

type AuditLogRow = {
  id: string
  action: string
  entityType: string
  entityId: string
  metadata: unknown
  createdAt: Date
  actorUser: { displayName: string; email: string; role: string } | null
  actorInstitution: { code: string; name: string } | null
  case: { publicCode: string } | null
}

export type AuditLogPrismaClient = {
  auditLog: {
    findMany(args: Prisma.AuditLogFindManyArgs): Promise<AuditLogRow[]>
  }
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function cleanBoundedText(value: string | undefined): string | undefined {
  const trimmed = value?.trim()

  if (!trimmed || trimmed.length > MAX_FILTER_LENGTH) {
    return undefined
  }

  return trimmed
}

export function userCanViewAudit(user: AuthenticatedUser): boolean {
  return (
    user.status === 'ACTIVE' &&
    user.institutionStatus === 'ACTIVE' &&
    (user.role === 'SYSTEM_ADMIN' || user.role === 'AUDITOR')
  )
}

export function parseAuditLogFilters(raw: Record<string, string | string[] | undefined>): AuditLogFilters {
  const filters: AuditLogFilters = {}
  const action = firstSearchParam(raw.action)
  const entityType = cleanBoundedText(firstSearchParam(raw.entityType))
  const publicCode = cleanBoundedText(firstSearchParam(raw.publicCode))
  const actor = cleanBoundedText(firstSearchParam(raw.actor))

  if (action && auditActionValues.includes(action as (typeof auditActionValues)[number])) {
    filters.action = action as AuditLogFilters['action']
  }

  if (entityType) {
    filters.entityType = entityType
  }

  if (publicCode) {
    filters.publicCode = publicCode
  }

  if (actor) {
    filters.actor = actor
  }

  return filters
}

export function buildAuditLogQuery(filters: AuditLogFilters): Prisma.AuditLogFindManyArgs {
  const clauses: Prisma.AuditLogWhereInput[] = []

  if (filters.action) {
    clauses.push({ action: filters.action })
  }

  if (filters.entityType) {
    clauses.push({ entityType: { equals: filters.entityType, mode: 'insensitive' } })
  }

  if (filters.publicCode) {
    clauses.push({ case: { publicCode: { contains: filters.publicCode, mode: 'insensitive' } } })
  }

  if (filters.actor) {
    clauses.push({
      OR: [
        { actorUser: { email: { contains: filters.actor, mode: 'insensitive' } } },
        { actorUser: { displayName: { contains: filters.actor, mode: 'insensitive' } } },
        { actorInstitution: { code: { contains: filters.actor, mode: 'insensitive' } } },
      ],
    })
  }

  return {
    where: clauses.length > 0 ? { AND: clauses } : undefined,
    orderBy: { createdAt: 'desc' },
    take: MAX_AUDIT_ENTRIES,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      metadata: true,
      createdAt: true,
      actorUser: { select: { displayName: true, email: true, role: true } },
      actorInstitution: { select: { code: true, name: true } },
      case: { select: { publicCode: true } },
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeMetadataKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function isSensitiveMetadataKey(key: string): boolean {
  const normalizedKey = normalizeMetadataKey(key)

  return (
    exactSensitiveMetadataKeys.has(normalizedKey) ||
    highRiskSensitiveMetadataKeyFragments.some((fragment) => normalizedKey.includes(fragment)) ||
    protectedPersonMetadataKeyFragments.some((fragment) => normalizedKey.includes(fragment))
  )
}

function sanitizeMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeMetadata).filter((item) => item !== undefined)
  }

  if (!isRecord(value)) {
    return value
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !isSensitiveMetadataKey(key))
      .map(([key, entryValue]) => [key, sanitizeMetadata(entryValue)])
      .filter(([, entryValue]) => entryValue !== undefined),
  )
}

function actorLabel(actorUser: AuditLogRow['actorUser']): string {
  if (!actorUser) {
    return 'Sistema / seed demo'
  }

  return `${actorUser.displayName} · ${actorUser.email} · ${actorUser.role}`
}

function institutionLabel(actorInstitution: AuditLogRow['actorInstitution']): string {
  if (!actorInstitution) {
    return 'Institución no disponible'
  }

  return `${actorInstitution.code} · ${actorInstitution.name}`
}

export function serializeAuditLogEntry(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    publicCode: row.case?.publicCode ?? (isRecord(row.metadata) && typeof row.metadata.publicCode === 'string' ? row.metadata.publicCode : null),
    createdAt: row.createdAt.toISOString(),
    actor: actorLabel(row.actorUser),
    institution: institutionLabel(row.actorInstitution),
    metadata: sanitizeMetadata(row.metadata),
  }
}

export async function listAuditLogEntries({
  prisma,
  filters,
}: {
  prisma: AuditLogPrismaClient
  filters: AuditLogFilters
}): Promise<AuditLogEntry[]> {
  const rows = await prisma.auditLog.findMany(buildAuditLogQuery(filters))

  return rows.map(serializeAuditLogEntry)
}
