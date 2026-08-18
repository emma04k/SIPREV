import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const seedPath = join(process.cwd(), 'prisma/seed.mjs')
const verifyPath = join(process.cwd(), 'prisma/verify-seed.mjs')
const seedSource = existsSync(seedPath) ? readFileSync(seedPath, 'utf8') : ''
const verifySource = existsSync(verifyPath) ? readFileSync(verifyPath, 'utf8') : ''

describe('Phase 2 synthetic seed contract', () => {
  it('creates clearly synthetic institutions and demo users for the Phase 2 workflow', () => {
    expect(seedSource).toContain('SIPREV-CENTRAL-DEMO')
    expect(seedSource).toContain('COMISARIA-DEMO-NORTE')
    expect(seedSource).toContain('FISCALIA-DEMO-CONTROL')
    expect(seedSource).toContain('AUDITORIA-DEMO')

    for (const email of [
      'admin.demo@siprev.local',
      'comisaria.demo@siprev.local',
      'fiscalia.demo@siprev.local',
      'auditor.demo@siprev.local',
    ]) {
      expect(seedSource, `missing demo user ${email}`).toContain(email)
    }
  })

  it('loads at least two fake cases with protected-person separation, events, assignments, and audit logs', () => {
    for (const publicCode of ['SIPREV-DEMO-CASE-001', 'SIPREV-DEMO-CASE-002']) {
      expect(seedSource, `missing case ${publicCode}`).toContain(publicCode)
    }

    expect(seedSource).toContain('nonSensitiveSummary')
    expect(seedSource).not.toMatch(/\bsummary\s*:/)

    for (const syntheticMarker of ['DEMO-DOC-0001', 'DEMO-DOC-0002', 'Persona Demo Uno', 'Persona Demo Dos']) {
      expect(seedSource, `missing synthetic protected-person marker ${syntheticMarker}`).toContain(syntheticMarker)
    }

    for (const relationName of ['protectedPerson', 'aggressorReferences', 'events', 'assignments', 'auditLogs']) {
      expect(seedSource, `seed should create ${relationName}`).toContain(relationName)
    }
  })

  it('keeps seed data obviously fake and excludes real-world identifiers', () => {
    expect(seedSource).toMatch(/synthetic|sint[eé]tico|demo/i)
    expect(seedSource).toContain('@siprev.local')
    expect(seedSource).toContain('DEMO-')
    expect(seedSource).not.toMatch(/\b[0-9]{8,10}\b/)
    expect(seedSource).not.toMatch(/gmail\.com|hotmail\.com|outlook\.com/i)
  })

  it('adds a lightweight seeded-record verification script', () => {
    expect(verifySource).toContain('institution')
    expect(verifySource).toContain('case')
    expect(verifySource).toContain('protectedPerson')
    expect(verifySource).toContain('auditLog')
  })

  it('verifies exact expected demo institution codes, users, and cases rather than only counts', () => {
    for (const expectedInstitutionCode of [
      'SIPREV-CENTRAL-DEMO',
      'COMISARIA-DEMO-NORTE',
      'FISCALIA-DEMO-CONTROL',
      'AUDITORIA-DEMO',
    ]) {
      expect(verifySource, `verify should check ${expectedInstitutionCode}`).toContain(expectedInstitutionCode)
    }

    for (const expectedUserEmail of [
      'admin.demo@siprev.local',
      'comisaria.demo@siprev.local',
      'fiscalia.demo@siprev.local',
      'auditor.demo@siprev.local',
    ]) {
      expect(verifySource, `verify should check ${expectedUserEmail}`).toContain(expectedUserEmail)
    }

    for (const expectedCaseCode of ['SIPREV-DEMO-CASE-001', 'SIPREV-DEMO-CASE-002']) {
      expect(verifySource, `verify should check ${expectedCaseCode}`).toContain(expectedCaseCode)
    }
  })
})
