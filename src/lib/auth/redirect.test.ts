import { describe, expect, it } from 'vitest'

import { safeRedirectPath } from './redirect'

describe('safeRedirectPath', () => {
  it('keeps same-origin relative paths for post-login navigation', () => {
    expect(safeRedirectPath('/dashboard')).toBe('/dashboard')
    expect(safeRedirectPath('/api/cases/SIPREV-DEMO-CASE-001')).toBe('/api/cases/SIPREV-DEMO-CASE-001')
  })

  it.each([
    ['absolute https URL', 'https://evil.example/phish'],
    ['absolute http URL', 'http://evil.example/phish'],
    ['protocol-relative URL', '//evil.example/phish'],
    ['non-root relative URL', 'dashboard'],
    ['empty value', ''],
    ['missing value', null],
  ])('defaults %s to the dashboard', (_label, value) => {
    expect(safeRedirectPath(value)).toBe('/dashboard')
  })
})
