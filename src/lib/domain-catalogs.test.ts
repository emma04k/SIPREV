import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const catalogPath = join(process.cwd(), 'src/lib/domain-catalogs.ts')
const catalogSource = existsSync(catalogPath) ? readFileSync(catalogPath, 'utf8') : ''

describe('Phase 2 domain catalogs contract', () => {
  it('publishes expected violence type catalog values for triage', () => {
    expect(catalogSource).toContain('violenceTypeCatalog')
    for (const value of ['PHYSICAL', 'PSYCHOLOGICAL', 'SEXUAL', 'ECONOMIC', 'DIGITAL']) {
      expect(catalogSource, `missing violence type ${value}`).toContain(value)
    }
  })

  it('publishes expected risk and status workflow values', () => {
    expect(catalogSource).toContain('caseRiskLevelCatalog')
    expect(catalogSource).toContain('caseStatusCatalog')
    for (const value of ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'OPEN', 'IN_FOLLOW_UP', 'REFERRED', 'CLOSED']) {
      expect(catalogSource, `missing workflow value ${value}`).toContain(value)
    }
  })

  it('documents that catalogs and fixtures are synthetic demo-only boundaries', () => {
    expect(catalogSource).toMatch(/sint[eé]tic|synthetic/i)
    expect(catalogSource).toMatch(/no use datos reales|no real data/i)
  })
})
