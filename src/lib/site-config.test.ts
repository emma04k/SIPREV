import { describe, expect, it } from 'vitest'

import { getDemoGuardrails, siteConfig } from './site-config'

describe('siteConfig', () => {
  it('describes SIPREV as an educational protected-record demo with no public registration', () => {
    expect(siteConfig.name).toBe('SIPREV')
    expect(siteConfig.isEducationalDemo).toBe(true)
    expect(siteConfig.allowsPublicRegistration).toBe(false)

    const guardrails = getDemoGuardrails()

    expect(guardrails).toContain('Solo datos sintéticos')
    expect(guardrails.some((guardrail) => /sin registro público/i.test(guardrail))).toBe(true)
    expect(guardrails.some((guardrail) => /credenciales/i.test(guardrail))).toBe(true)
  })
})
