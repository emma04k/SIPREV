import { describe, expect, it, vi } from 'vitest'

import type { AuthenticatedUser } from '@/lib/auth/credentials'
import {
  buildAuditLogQuery,
  listAuditLogEntries,
  parseAuditLogFilters,
  serializeAuditLogEntry,
  userCanViewAudit,
} from './audit-log-query'

const baseUser: AuthenticatedUser = {
  id: 'demo-user-auditor',
  email: 'auditor.demo@siprev.local',
  displayName: 'Auditora Demo',
  role: 'AUDITOR',
  status: 'ACTIVE',
  institutionId: 'demo-inst-auditoria',
  institutionCode: 'AUDITORIA-DEMO',
  institutionStatus: 'ACTIVE',
}

describe('Phase 6 audit admin query contract', () => {
  it.each(['SYSTEM_ADMIN', 'AUDITOR'] as const)('allows active %s in an active institution to view audit', (role) => {
    expect(userCanViewAudit({ ...baseUser, role })).toBe(true)
  })

  it.each(['CASE_WORKER', 'PROSECUTOR', 'INSTITUTION_ADMIN'] as const)('rejects %s from audit view even when active', (role) => {
    expect(userCanViewAudit({ ...baseUser, role })).toBe(false)
  })

  it('rejects inactive users and users from inactive institutions from audit view', () => {
    expect(userCanViewAudit({ ...baseUser, status: 'SUSPENDED' })).toBe(false)
    expect(userCanViewAudit({ ...baseUser, institutionStatus: 'INACTIVE' })).toBe(false)
  })

  it('builds a bounded minimal Prisma query with action and public code filters', () => {
    const query = buildAuditLogQuery({ action: 'VIEW', publicCode: 'SIPREV-DEMO-CASE-001' })

    expect(query).toMatchObject({
      take: 100,
      orderBy: { createdAt: 'desc' },
      where: {
        AND: [
          { action: 'VIEW' },
          { case: { publicCode: { contains: 'SIPREV-DEMO-CASE-001', mode: 'insensitive' } } },
        ],
      },
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
    })

    expect(JSON.stringify(query.select)).not.toMatch(/passwordHash|protectedPerson|events|assignments|session|cookie|token/i)
  })

  it('normalizes bounded filter input and discards unsupported values', () => {
    expect(
      parseAuditLogFilters({
        action: 'UPDATE',
        entityType: 'Case',
        publicCode: '  SIPREV-DEMO-CASE-002  ',
        actor: 'auditor.demo@siprev.local',
      }),
    ).toEqual({ action: 'UPDATE', entityType: 'Case', publicCode: 'SIPREV-DEMO-CASE-002', actor: 'auditor.demo@siprev.local' })

    expect(parseAuditLogFilters({ action: 'DELETE', publicCode: 'x'.repeat(130), actor: '' })).toEqual({})
  })

  it('serializes audit rows with public code while sanitizing sensitive metadata recursively', async () => {
    const createdAt = new Date('2026-08-18T20:30:00.000Z')
    const rawEntry = {
      id: 'audit-001',
      action: 'UPDATE',
      entityType: 'Case',
      entityId: 'demo-case-001',
      createdAt,
      actorUser: { displayName: 'Auditora Demo', email: 'auditor.demo@siprev.local', role: 'AUDITOR' },
      actorInstitution: { code: 'AUDITORIA-DEMO', name: 'Auditoría Demo' },
      case: { publicCode: 'SIPREV-DEMO-CASE-001' },
      metadata: {
        publicCode: 'SIPREV-DEMO-CASE-001',
        status: 'IN_FOLLOW_UP',
        password: 'never-render',
        token: 'never-render',
        session: { id: 'never-render' },
        cookie: 'never-render',
        submittedBody: { demoFullName: 'Persona Real No', detail: 'body detail must not render' },
        nested: { demoDocumentNumber: 'DEMO-SECRET', safe: 'ok' },
      },
    }

    const serialized = serializeAuditLogEntry(rawEntry)
    const serializedText = JSON.stringify(serialized)

    expect(serialized).toMatchObject({
      id: 'audit-001',
      action: 'UPDATE',
      entityType: 'Case',
      entityId: 'demo-case-001',
      publicCode: 'SIPREV-DEMO-CASE-001',
      createdAt: '2026-08-18T20:30:00.000Z',
      actor: 'Auditora Demo · auditor.demo@siprev.local · AUDITOR',
      institution: 'AUDITORIA-DEMO · Auditoría Demo',
      metadata: { publicCode: 'SIPREV-DEMO-CASE-001', status: 'IN_FOLLOW_UP', nested: { safe: 'ok' } },
    })
    expect(serializedText).not.toMatch(/never-render|password|token|session|cookie|submittedBody|demoFullName|demoDocumentNumber|body detail/i)

    const findMany = vi.fn(async () => [rawEntry])
    const entries = await listAuditLogEntries({ prisma: { auditLog: { findMany } }, filters: { publicCode: 'SIPREV' } })

    expect(findMany).toHaveBeenCalledWith(buildAuditLogQuery({ publicCode: 'SIPREV' }))
    expect(entries).toEqual([serialized])
  })

  it('redacts compound and snake-case sensitive metadata keys while preserving safe audit fields', () => {
    const serialized = serializeAuditLogEntry({
      id: 'audit-variant-001',
      action: 'UPDATE',
      entityType: 'Case',
      entityId: 'demo-case-variant',
      createdAt: new Date('2026-08-18T21:00:00.000Z'),
      actorUser: null,
      actorInstitution: null,
      case: null,
      metadata: {
        publicCode: 'SIPREV-DEMO-CASE-009',
        status: 'IN_REVIEW',
        eventCategory: 'case-status',
        previousStatus: 'OPEN',
        newStatus: 'IN_REVIEW',
        statusChanged: true,
        password_hash: 'synthetic-password-hash-redacted',
        passwordHash: 'synthetic-password-hash-redacted',
        accessToken: 'synthetic-access-token-redacted',
        session_id: 'synthetic-session-id-redacted',
        cookieHeader: 'synthetic-cookie-header-redacted',
        authorizationHeader: 'synthetic-authorization-header-redacted',
        request_body: { status: 'SHOULD_NOT_RENDER' },
        submitted_body: { status: 'SHOULD_NOT_RENDER' },
        demo_full_name: 'synthetic-full-name-redacted',
        demo_document_number: 'synthetic-document-number-redacted',
      },
    })

    expect(serialized.metadata).toEqual({
      publicCode: 'SIPREV-DEMO-CASE-009',
      status: 'IN_REVIEW',
      eventCategory: 'case-status',
      previousStatus: 'OPEN',
      newStatus: 'IN_REVIEW',
      statusChanged: true,
    })
    expect(JSON.stringify(serialized.metadata)).not.toMatch(
      /password_hash|passwordHash|accessToken|session_id|cookieHeader|authorizationHeader|request_body|submitted_body|demo_full_name|demo_document_number|synthetic-.*-redacted|SHOULD_NOT_RENDER/i,
    )
  })

  it('redacts nested sensitive variants inside objects and arrays while preserving nested safe values', () => {
    const serialized = serializeAuditLogEntry({
      id: 'audit-variant-002',
      action: 'VIEW',
      entityType: 'Case',
      entityId: 'demo-case-nested',
      createdAt: new Date('2026-08-18T21:05:00.000Z'),
      actorUser: null,
      actorInstitution: null,
      case: null,
      metadata: {
        nested: {
          publicCode: 'SIPREV-DEMO-NESTED',
          status: 'OPEN',
          password_hash: 'synthetic-nested-password-redacted',
          request_body: { status: 'SHOULD_NOT_RENDER' },
          history: [
            {
              eventCategory: 'safe-history',
              previousStatus: 'OPEN',
              newStatus: 'IN_REVIEW',
              statusChanged: true,
              accessToken: 'synthetic-nested-token-redacted',
              demo_document_number: 'synthetic-nested-document-redacted',
            },
            {
              publicCode: 'SIPREV-DEMO-ARRAY',
              status: 'CLOSED',
              cookieHeader: 'synthetic-nested-cookie-redacted',
              authorizationHeader: 'synthetic-nested-authorization-redacted',
              submitted_body: { status: 'SHOULD_NOT_RENDER' },
            },
          ],
        },
      },
    })

    expect(serialized.metadata).toEqual({
      nested: {
        publicCode: 'SIPREV-DEMO-NESTED',
        status: 'OPEN',
        history: [
          {
            eventCategory: 'safe-history',
            previousStatus: 'OPEN',
            newStatus: 'IN_REVIEW',
            statusChanged: true,
          },
          {
            publicCode: 'SIPREV-DEMO-ARRAY',
            status: 'CLOSED',
          },
        ],
      },
    })
    expect(JSON.stringify(serialized.metadata)).not.toMatch(
      /password_hash|accessToken|cookieHeader|authorizationHeader|request_body|submitted_body|demo_document_number|synthetic-.*-redacted|SHOULD_NOT_RENDER/i,
    )
  })
})
