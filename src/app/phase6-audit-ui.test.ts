import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function readIfExists(relativePath: string): string {
  const fullPath = join(process.cwd(), relativePath)
  return existsSync(fullPath) ? readFileSync(fullPath, 'utf8') : ''
}

describe('Phase 6 audit/admin UI source contract', () => {
  it('adds a protected /audit page for active admin/auditor roles with legal reserve copy and no public registration', () => {
    const pageSource = readIfExists('src/app/audit/page.tsx')

    expect(pageSource).toContain('requireUser')
    expect(pageSource).toContain("redirect('/auth/login?next=/audit')")
    expect(pageSource).toContain('userCanViewAudit')
    expect(pageSource).toContain('listAuditLogEntries')
    expect(pageSource).toMatch(/Auditor[ií]a|Bit[aá]cora/i)
    expect(pageSource).toMatch(/reserva legal|trazabilidad|datos sint[eé]ticos|solo demo/i)
    expect(pageSource).toMatch(/No use datos reales|sin datos reales/i)
    expect(pageSource).not.toMatch(/registro p[uú]blico|public registration/i)
  })

  it('renders audit filters, bounded results, sanitized metadata and navigation back to dashboard/cases', () => {
    const pageSource = readIfExists('src/app/audit/page.tsx')

    expect(pageSource).toMatch(/name="action"/)
    expect(pageSource).toMatch(/name="entityType"/)
    expect(pageSource).toMatch(/name="publicCode"/)
    expect(pageSource).toMatch(/name="actor"/)
    expect(pageSource).toMatch(/metadata|Metadatos/i)
    expect(pageSource).toMatch(/createdAt|Fecha/i)
    expect(pageSource).toContain('href="/dashboard"')
    expect(pageSource).toContain('href="/cases"')
    expect(pageSource).toMatch(/take:\s*100|100 registros|últimos 100|MAX_AUDIT_ENTRIES/i)
    expect(pageSource).not.toMatch(/passwordHash|password\b|token\b|session\b|cookie\b|demoFullName|demoDocumentNumber|submittedBody/i)
  })

  it('updates middleware and dashboard navigation so /audit is private UX-gated but authorization remains server-side', () => {
    const middlewareSource = readIfExists('middleware.ts')
    const dashboardSource = readIfExists('src/app/dashboard/page.tsx')

    expect(middlewareSource).toContain("'/audit'")
    expect(middlewareSource).toContain("'/audit/:path*'")
    expect(middlewareSource).toContain('/auth/login')
    expect(middlewareSource).not.toMatch(/@prisma\/client|bcrypt|credentials|PrismaClient|requireUser/)
    expect(dashboardSource).toContain('href="/audit"')
    expect(dashboardSource).toMatch(/Auditor[ií]a|Bit[aá]cora/i)
  })
})
