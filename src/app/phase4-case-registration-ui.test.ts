import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function readIfExists(relativePath: string): string {
  const fullPath = join(process.cwd(), relativePath)
  return existsSync(fullPath) ? readFileSync(fullPath, 'utf8') : ''
}

describe('Phase 4 protected case registration UI source contract', () => {
  it('protects /cases/new with server auth and shows a no-real-data warning without public registration copy', () => {
    const pageSource = readIfExists('src/app/cases/new/page.tsx')

    expect(pageSource).toContain('requireUser')
    expect(pageSource).toContain("redirect('/auth/login?next=/cases/new')")
    expect(pageSource).toMatch(/Registrar nuevo caso|Nuevo caso protegido/i)
    expect(pageSource).toMatch(/No use datos reales|datos sint[eé]ticos|demo local/i)
    expect(pageSource).toMatch(/sin registro p[uú]blico|no existe registro p[uú]blico/i)
    expect(pageSource).toContain('/api/cases')
    expect(pageSource).toMatch(/name="caseType"/)
    expect(pageSource).toMatch(/name="violenceTypes"/)
    expect(pageSource).toMatch(/name="riskLevel"/)
    expect(pageSource).toMatch(/name="protectedPerson\.demoFullName"/)
    expect(pageSource).toMatch(/name="initialEvent\.detail"/)
  })

  it('does not render the new-case form for authenticated users without create permission', () => {
    const pageSource = readIfExists('src/app/cases/new/page.tsx')
    const guardIndex = pageSource.indexOf('!userCanCreateCase(user)')
    const formIndex = pageSource.indexOf('<form')

    expect(pageSource).toContain('userCanCreateCase')
    expect(guardIndex).toBeGreaterThan(-1)
    expect(formIndex).toBeGreaterThan(-1)
    expect(guardIndex).toBeLessThan(formIndex)
    expect(pageSource).toMatch(/No autorizado para registrar casos|No tiene permisos para registrar casos|403/i)
  })

  it('adds /cases/new to middleware protected route prefixes without importing server-only auth modules', () => {
    const middlewareSource = readIfExists('middleware.ts')

    expect(middlewareSource).toContain('/cases')
    expect(middlewareSource).toContain('/auth/login')
    expect(middlewareSource).not.toMatch(/@prisma\/client|bcrypt|credentials|PrismaClient/)
  })

  it('updates dashboard with a new-case link and a recent-case list signal', () => {
    const dashboardSource = readIfExists('src/app/dashboard/page.tsx')

    expect(dashboardSource).toContain('href="/cases/new"')
    expect(dashboardSource).toMatch(/Registrar caso|Nuevo caso/i)
    expect(dashboardSource).toMatch(/Casos recientes|Últimos casos|recentCases/i)
    expect(dashboardSource).toMatch(/publicCode|nonSensitiveSummary/)
  })
})
