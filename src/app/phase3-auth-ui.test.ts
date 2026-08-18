import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function readIfExists(relativePath: string): string {
  const fullPath = join(process.cwd(), relativePath)
  return existsSync(fullPath) ? readFileSync(fullPath, 'utf8') : ''
}

describe('Phase 3 protected route and login UI source contract', () => {
  it('adds Auth.js configuration and route handlers without any registration endpoint', () => {
    const authSource = readIfExists('auth.ts')
    const routeSource = readIfExists('src/app/api/auth/[...nextauth]/route.ts')

    expect(authSource).toContain('NextAuth')
    expect(authSource).toContain('Credentials')
    expect(authSource).toContain('authorizeCredentials')
    expect(routeSource).toContain('handlers')

    for (const forbiddenPath of ['src/app/auth/register/page.tsx', 'src/app/api/register/route.ts', 'src/app/api/auth/register/route.ts']) {
      expect(existsSync(join(process.cwd(), forbiddenPath)), `${forbiddenPath} must not exist`).toBe(false)
    }
  })

  it('renders a Spanish login page with educational warning and no public registration CTA', () => {
    const loginSource = readIfExists('src/app/auth/login/page.tsx')

    expect(loginSource).toMatch(/Iniciar sesi[oó]n/i)
    expect(loginSource).toContain('SiprevDemo2026!')
    expect(loginSource).toMatch(/demo educativo|piloto educativo/i)
    expect(loginSource).toMatch(/sin registro p[uú]blico|no existe registro p[uú]blico/i)
    expect(loginSource).not.toMatch(/Crear cuenta|Registrarse|auth\/register/i)
  })

  it('sanitizes login next values on initial render and again inside the server action', () => {
    const loginSource = readIfExists('src/app/auth/login/page.tsx')

    expect(loginSource).toContain('safeRedirectPath')
    expect(loginSource).toMatch(/safeRedirectPath\(params\.next\)/)
    expect(loginSource).toMatch(/safeRedirectPath\(formData\.get\('next'\)\)/)
    expect(loginSource).toContain('redirectTo')
    expect(loginSource).not.toMatch(/const redirectTo = String\(formData\.get\('next'\)/)
  })

  it('protects dashboard with requireUser and shows role/institution context', () => {
    const dashboardSource = readIfExists('src/app/dashboard/page.tsx')

    expect(dashboardSource).toContain('requireUser')
    expect(dashboardSource).toMatch(/Rol|role/i)
    expect(dashboardSource).toMatch(/Instituci[oó]n|institution/i)
    expect(dashboardSource).toMatch(/casos demo|trazabilidad|auditor/i)
  })

  it('redirects unauthenticated private dashboard requests to login without importing Prisma or bcrypt into middleware', () => {
    const middlewareSource = readIfExists('middleware.ts')

    expect(middlewareSource).toContain('/dashboard')
    expect(middlewareSource).toContain('/auth/login')
    expect(middlewareSource).toContain('next')
    expect(middlewareSource).not.toMatch(/@prisma\/client|bcrypt|credentials|PrismaClient/)
  })
})
