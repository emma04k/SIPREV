import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Phase 5 README demo flow contract', () => {
  it('documents consultation, follow-up, status change and Docker validation without real data', () => {
    const readme = readFileSync(join(process.cwd(), 'README.md'), 'utf8')

    expect(readme).toMatch(/Fase 5: consulta controlada y seguimiento/i)
    expect(readme).toContain('/cases')
    expect(readme).toContain('/cases/[publicCode]')
    expect(readme).toContain('/api/cases/[publicCode]/events')
    expect(readme).toMatch(/seguimiento nuevo aparece|línea de tiempo|timeline/i)
    expect(readme).toMatch(/AuditLog UPDATE|auditoría UPDATE/i)
    expect(readme).toMatch(/AuditLog VIEW|auditoría VIEW/i)
    expect(readme).toMatch(/No use datos reales|datos sint[eé]ticos/i)
    expect(readme).toContain('docker compose exec app npm run build')
    expect(readme).toContain('docker compose exec app npm run db:verify')
  })
})
