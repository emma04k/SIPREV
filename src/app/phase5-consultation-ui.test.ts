import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function readIfExists(relativePath: string): string {
  const fullPath = join(process.cwd(), relativePath)
  return existsSync(fullPath) ? readFileSync(fullPath, 'utf8') : ''
}

describe('Phase 5 consultation and follow-up UI source contract', () => {
  it('adds a protected /cases consultation page with server-side filters and safe authorized links', () => {
    const pageSource = readIfExists('src/app/cases/page.tsx')

    expect(pageSource).toContain('requireUser')
    expect(pageSource).toContain("redirect('/auth/login?next=/cases')")
    expect(pageSource).toContain('listAuthorizedCases')
    expect(pageSource).toContain('parseCaseListFilters')
    expect(pageSource).toMatch(/name="status"/)
    expect(pageSource).toMatch(/name="riskLevel"/)
    expect(pageSource).toMatch(/name="caseType"/)
    expect(pageSource).toMatch(/name="q"/)
    expect(pageSource).toContain('href={`/cases/${caseRecord.publicCode}`}')
    expect(pageSource).toMatch(/No use datos reales|datos sint[eé]ticos|demo local/i)
    expect(pageSource).not.toMatch(/registro p[uú]blico|public registration/i)
  })

  it('adds a protected detail page with timeline, VIEW audit and follow-up/status controls', () => {
    const detailSource = readIfExists('src/app/cases/[publicCode]/page.tsx')
    const formSource = readIfExists('src/app/cases/[publicCode]/follow-up-form.tsx')
    const combinedSource = `${detailSource}\n${formSource}`

    expect(detailSource).toContain('requireUser')
    expect(detailSource).toContain('canAccessCase')
    expect(detailSource).toContain('recordSensitiveCaseView')
    expect(detailSource).toMatch(/L[ií]nea de tiempo|timeline/i)
    expect(combinedSource).toContain('/api/cases/${publicCode}/events')
    expect(combinedSource).toMatch(/name="category"/)
    expect(combinedSource).toMatch(/name="title"/)
    expect(combinedSource).toMatch(/name="detail"/)
    expect(combinedSource).toMatch(/name="newStatus"/)
    expect(combinedSource).toMatch(/FOLLOW_UP|RISK_REVIEW|STATUS_CHANGE/)
    expect(combinedSource).toMatch(/No use datos reales|datos sint[eé]ticos|demo local/i)
    expect(combinedSource).not.toMatch(/public registration|registro p[uú]blico/i)
  })

  it('links dashboard case cards and primary actions to the full consultation flow', () => {
    const dashboardSource = readIfExists('src/app/dashboard/page.tsx')

    expect(dashboardSource).toContain('href="/cases"')
    expect(dashboardSource).toContain('href={`/cases/${caseRecord.publicCode}`}')
    expect(dashboardSource).toMatch(/Consultar casos|Ver consulta|Listado autorizado/i)
  })
})
