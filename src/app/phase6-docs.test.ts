import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function readIfExists(relativePath: string): string {
  const fullPath = join(process.cwd(), relativePath)
  return existsSync(fullPath) ? readFileSync(fullPath, 'utf8') : ''
}

describe('Phase 6 demo documentation and legal reserve contract', () => {
  it('documents the final end-to-end demo, audit view, Docker validation and security checklist', () => {
    const readme = readIfExists('README.md')

    expect(readme).toMatch(/Fase 6|Phase 6/i)
    expect(readme).toMatch(/Flujo demo end-to-end/i)
    expect(readme).toMatch(/\/audit/)
    expect(readme).toMatch(/admin\.demo@siprev\.local/)
    expect(readme).toMatch(/auditor\.demo@siprev\.local/)
    expect(readme).toMatch(/docker compose exec app npm run test/)
    expect(readme).toMatch(/docker compose exec app npm run build/)
    expect(readme).toMatch(/docker compose exec app npm run db:verify/)
    expect(readme).toMatch(/Checklist de seguridad|reserva legal/i)
    expect(readme).toMatch(/No use datos reales|datos sint[eé]ticos|ficticios/i)
    expect(readme).toMatch(/docs\/siprev-architecture\.html/)
  })

  it('documents Vercel + Neon deployment readiness with placeholders and no real connection string', () => {
    const readme = readIfExists('README.md')
    const envExample = readIfExists('.env.example')

    expect(readme).toMatch(/Vercel\s*\+\s*Neon|Neon\s*\+\s*Vercel/i)
    expect(readme).toMatch(/DATABASE_URL=.*sslmode=require|DATABASE_URL.*<NEON/i)
    expect(readme).toMatch(/AUTH_SECRET|NEXTAUTH_SECRET/)
    expect(readme).toMatch(/prisma migrate deploy|db:deploy/i)
    expect(readme).toMatch(/No despliegue datos reales|demo-only|solo demo/i)
    expect(`${readme}\n${envExample}`).not.toMatch(/postgresql:\/\/[^\s<]*@[a-z0-9-]+\.(?:neon|aws|azure|gcp|supabase)[^\s`'"]*/i)
  })

  it('keeps legal reserve/no-real-data copy visible on primary demo surfaces', () => {
    const surfaces = [
      readIfExists('src/app/dashboard/page.tsx'),
      readIfExists('src/app/cases/page.tsx'),
      readIfExists('src/app/cases/new/page.tsx'),
      readIfExists('src/app/cases/[publicCode]/page.tsx'),
      readIfExists('src/app/cases/[publicCode]/follow-up-form.tsx'),
      readIfExists('src/app/audit/page.tsx'),
    ]

    for (const source of surfaces) {
      expect(source).toMatch(/No use datos reales|datos sint[eé]ticos|fictici[oa]s|demo local/i)
    }
  })

  it('adds a self-contained architecture diagram covering auth, RBAC, audit, Postgres, Vercel and Neon without JavaScript', () => {
    const diagram = readIfExists('docs/siprev-architecture.html')

    expect(diagram).toMatch(/SIPREV/i)
    expect(diagram).toMatch(/Next\.js/i)
    expect(diagram).toMatch(/Auth\.js/i)
    expect(diagram).toMatch(/Prisma/i)
    expect(diagram).toMatch(/PostgreSQL/i)
    expect(diagram).toMatch(/Vercel/i)
    expect(diagram).toMatch(/Neon/i)
    expect(diagram).toMatch(/RBAC/i)
    expect(diagram).toMatch(/AuditLog|auditor[ií]a/i)
    expect(diagram).toMatch(/reserva legal|datos sint[eé]ticos/i)
    expect(diagram).not.toMatch(/<script\b/i)
    expect(diagram).not.toMatch(/DATABASE_URL=.*@|AUTH_SECRET=.*[A-Za-z0-9]{24,}/i)
  })
})
