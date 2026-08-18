import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const schema = readFileSync(new URL('./schema.prisma', import.meta.url), 'utf8')

function modelBlock(modelName: string): string {
  const match = schema.match(new RegExp(`model ${modelName} \\{([\\s\\S]*?)\\n\\}`))
  return match?.[1] ?? ''
}

function enumBlock(enumName: string): string {
  const match = schema.match(new RegExp(`enum ${enumName} \\{([\\s\\S]*?)\\n\\}`))
  return match?.[1] ?? ''
}

describe('Phase 2 Prisma data model contract', () => {
  it('defines the required interinstitutional case-management models', () => {
    for (const modelName of [
      'Institution',
      'User',
      'Case',
      'ProtectedPerson',
      'AggressorReference',
      'CaseEvent',
      'CaseAssignment',
      'AuditLog',
    ]) {
      expect(schema, `missing Prisma model ${modelName}`).toContain(`model ${modelName} {`)
    }
  })

  it('keeps sensitive triage/person fields out of the public case record', () => {
    const caseBlock = modelBlock('Case')
    const protectedPersonBlock = modelBlock('ProtectedPerson')

    expect(caseBlock).toContain('publicCode')
    expect(caseBlock).toContain('nonSensitiveSummary')
    expect(caseBlock).not.toMatch(/^\s+summary\s+String\b/m)
    expect(caseBlock).toContain('protectedPerson')
    expect(caseBlock).not.toMatch(/fullName|documentNumber|birthDate|phone|address/i)

    for (const fieldName of ['demoFullName', 'demoDocumentNumber', 'demoBirthYear', 'demoContactNote']) {
      expect(protectedPersonBlock, `ProtectedPerson should contain ${fieldName}`).toContain(fieldName)
    }
  })

  it('declares role/status/type/risk/action enums used by Phase 2 records', () => {
    const requiredEnums = {
      InstitutionType: ['CENTRAL_ADMIN', 'POLICE_STATION', 'PROSECUTOR_OFFICE', 'OVERSIGHT'],
      UserRole: ['SYSTEM_ADMIN', 'INSTITUTION_ADMIN', 'CASE_WORKER', 'PROSECUTOR', 'AUDITOR'],
      AccountStatus: ['INVITED', 'ACTIVE', 'SUSPENDED', 'REVOKED'],
      CaseType: ['INITIAL_REPORT', 'POLICE_REPORT', 'PROSECUTOR_REFERRAL'],
      ViolenceType: ['PHYSICAL', 'PSYCHOLOGICAL', 'SEXUAL', 'ECONOMIC', 'DIGITAL'],
      CaseRiskLevel: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      CaseStatus: ['OPEN', 'IN_FOLLOW_UP', 'REFERRED', 'CLOSED'],
      CaseEventCategory: ['INTAKE', 'RISK_REVIEW', 'FOLLOW_UP', 'REFERRAL', 'STATUS_CHANGE'],
      AssignmentStatus: ['ACTIVE', 'TRANSFERRED', 'COMPLETED'],
      AuditAction: ['CREATE', 'VIEW', 'UPDATE', 'ASSIGN', 'REFER', 'CLOSE', 'SEED'],
    }

    for (const [enumName, values] of Object.entries(requiredEnums)) {
      const block = enumBlock(enumName)
      expect(block, `missing enum ${enumName}`).not.toBe('')
      for (const value of values) {
        expect(block, `missing ${enumName}.${value}`).toMatch(new RegExp(`\\b${value}\\b`))
      }
    }
  })

  it('adds PostgreSQL-friendly indexes for identifiers, foreign keys, workflow queues, and audit lookup', () => {
    expect(modelBlock('Institution')).toContain('@@index([type])')
    expect(modelBlock('User')).toContain('@@index([institutionId])')
    expect(modelBlock('Case')).toContain('@unique')
    expect(modelBlock('Case')).toContain('@@index([status, riskLevel, createdAt])')
    expect(modelBlock('Case')).toContain('@@index([reportingInstitutionId])')
    expect(modelBlock('ProtectedPerson')).toContain('caseId             String   @unique')
    expect(modelBlock('ProtectedPerson')).not.toContain('@@index([caseId])')
    expect(modelBlock('CaseEvent')).toContain('@@index([caseId, occurredAt])')
    expect(modelBlock('CaseAssignment')).toContain('@@index([institutionId, status])')
    expect(modelBlock('AuditLog')).toContain('@@index([entityType, entityId])')
    expect(modelBlock('AuditLog')).toContain('@@index([actorUserId, createdAt])')
  })

  it('keeps audit logs after case deletion by nulling optional case references', () => {
    const auditBlock = modelBlock('AuditLog')

    expect(auditBlock).toContain('caseId             String?')
    expect(auditBlock).toMatch(/case\s+Case\?\s+@relation\(fields: \[caseId\], references: \[id\], onDelete: SetNull\)/)
    expect(auditBlock).not.toMatch(/case\s+Case\?\s+@relation\([^\n]*onDelete: Cascade\)/)
  })

  it('uses PostgreSQL timestamptz precision for traceability timestamps', () => {
    const timestampFieldsByModel = {
      Institution: ['createdAt', 'updatedAt'],
      User: ['createdAt', 'updatedAt'],
      Case: ['createdAt', 'updatedAt', 'closedAt'],
      ProtectedPerson: ['createdAt', 'updatedAt'],
      AggressorReference: ['createdAt', 'updatedAt'],
      CaseEvent: ['occurredAt', 'createdAt'],
      CaseAssignment: ['assignedAt', 'endedAt'],
      AuditLog: ['createdAt'],
    }

    for (const [modelName, fieldNames] of Object.entries(timestampFieldsByModel)) {
      const block = modelBlock(modelName)
      for (const fieldName of fieldNames) {
        expect(block, `${modelName}.${fieldName} should use timestamptz(3)`).toMatch(
          new RegExp(`^\\s+${fieldName}\\s+DateTime\\??[^\\n]*@db\\.Timestamptz\\(3\\)`, 'm'),
        )
      }
    }
  })
})
