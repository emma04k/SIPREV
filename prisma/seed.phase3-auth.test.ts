import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const seedSource = readFileSync(new URL('./seed.mjs', import.meta.url), 'utf8')
const envExampleSource = readFileSync(new URL('../.env.example', import.meta.url), 'utf8')
const composeSource = readFileSync(new URL('../docker-compose.yml', import.meta.url), 'utf8')

describe('Phase 3 local demo auth seed and env contract', () => {
  it('seeds precreated institutional users with bcrypt password hashes for the demo password', () => {
    expect(seedSource).toContain('SiprevDemo2026!')
    expect(seedSource).toContain('hashSync')
    expect(seedSource).toContain('demoPasswordHash')
    expect(seedSource).not.toContain('passwordHash: null')
  })

  it('treats SIPREV_DEMO_PASSWORD as a documented local reference, not a runtime secret override', () => {
    expect(envExampleSource).toContain('SIPREV_DEMO_PASSWORD')
    expect(envExampleSource).toMatch(/reference only|referencia/i)
    expect(seedSource).not.toContain('process.env.SIPREV_DEMO_PASSWORD')
  })

  it('documents Auth.js local demo environment variables and exposes them to the app service', () => {
    for (const requiredKey of ['AUTH_SECRET', 'AUTH_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL']) {
      expect(envExampleSource, `.env.example missing ${requiredKey}`).toContain(requiredKey)
      expect(composeSource, `docker-compose.yml app.environment missing ${requiredKey}`).toContain(requiredKey)
    }

    expect(envExampleSource).toMatch(/demo-only|solo.*demo|no.*producci[oó]n/i)
    expect(composeSource).toMatch(/AUTH_SECRET:|NEXTAUTH_SECRET:/)
  })
})
