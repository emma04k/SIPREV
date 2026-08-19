import Link from 'next/link'
import { redirect } from 'next/navigation'

import { requireUser } from '@/lib/auth/current-user'
import type { AuthenticatedUser } from '@/lib/auth/credentials'
import { authorizedCasesWhereForUser } from '@/lib/cases/case-access-query'
import { userCanCreateCase } from '@/lib/cases/create-case'
import { prisma } from '@/lib/prisma'

async function getRecentCases(user: AuthenticatedUser) {
  const where = authorizedCasesWhereForUser(user)

  if (where === null) {
    return []
  }

  return prisma.case.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      publicCode: true,
      nonSensitiveSummary: true,
      riskLevel: true,
      status: true,
      createdAt: true,
    },
  })
}

export default async function DashboardPage() {
  let user

  try {
    user = await requireUser()
  } catch {
    redirect('/auth/login?next=/dashboard')
  }

  const recentCases = await getRecentCases(user)
  const canRegisterCases = userCanCreateCase(user)

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white lg:px-8">
      <section className="mx-auto max-w-6xl space-y-8">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-teal-300">Panel protegido</p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Bienvenida institucional, {user.displayName}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Use únicamente datos sintéticos en la demo local. SIPREV no habilita registro público.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/cases"
                className="inline-flex rounded-full border border-teal-300 px-5 py-3 text-sm font-semibold text-teal-100 hover:bg-teal-300/10"
              >
                Consultar casos
              </Link>
              {canRegisterCases ? (
                <Link
                  href="/cases/new"
                  className="inline-flex rounded-full bg-teal-300 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-teal-200"
                >
                  Registrar caso
                </Link>
              ) : null}
            </div>
          </div>
          <div className="mt-6 grid gap-4 text-sm text-slate-200 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
              <p className="text-slate-400">Rol</p>
              <p className="mt-1 font-semibold text-teal-100">{user.role}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
              <p className="text-slate-400">Institución</p>
              <p className="mt-1 font-semibold text-teal-100">{user.institutionCode}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
              <p className="text-slate-400">Estado de cuenta</p>
              <p className="mt-1 font-semibold text-teal-100">{user.status}</p>
            </div>
          </div>
        </header>

        <div className="grid gap-5 md:grid-cols-3">
          <article className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold text-teal-100">Casos demo</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">Consulta protegida por RBAC para códigos SIPREV-DEMO-CASE-001 y SIPREV-DEMO-CASE-002.</p>
          </article>
          <article className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold text-teal-100">Trazabilidad</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">Cada vista sensible debe registrar auditoría VIEW del lado servidor.</p>
          </article>
          <article className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold text-teal-100">Auditoría</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">Accesos amplios solo para roles SYSTEM_ADMIN y AUDITOR activos; auditores no registran casos.</p>
          </article>
        </div>

        <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-300">Casos recientes</p>
              <h2 className="mt-2 text-2xl font-bold">Listado mínimo autorizado</h2>
            </div>
          </div>
          <div className="mt-5 divide-y divide-slate-800">
            {recentCases.length > 0 ? (
              recentCases.map((caseRecord) => (
                <article key={caseRecord.publicCode} className="grid gap-2 py-4 md:grid-cols-[1fr_auto]">
                  <div>
                    <Link href={`/cases/${caseRecord.publicCode}`} className="font-semibold text-teal-100 hover:text-teal-200">
                      {caseRecord.publicCode}
                    </Link>
                    <p className="mt-1 text-sm text-slate-300">{caseRecord.nonSensitiveSummary}</p>
                  </div>
                  <p className="text-sm text-slate-400">
                    {caseRecord.riskLevel} · {caseRecord.status} · {caseRecord.createdAt.toISOString().slice(0, 10)}
                  </p>
                </article>
              ))
            ) : (
              <p className="py-4 text-sm text-slate-400">Aún no hay casos autorizados para listar en esta demo.</p>
            )}
          </div>
        </section>
      </section>
    </main>
  )
}
