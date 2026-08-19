import Link from 'next/link'
import { redirect } from 'next/navigation'

import { requireUser } from '@/lib/auth/current-user'
import { caseRiskLevelCatalog, caseStatusCatalog } from '@/lib/domain-catalogs'
import { listAuthorizedCases, parseCaseListFilters } from '@/lib/cases/case-consultation'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type CasesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}

const caseTypeOptions = [
  { value: 'INITIAL_REPORT', label: 'Reporte inicial' },
  { value: 'POLICE_REPORT', label: 'Reporte policial' },
  { value: 'PROSECUTOR_REFERRAL', label: 'Remisión fiscalía' },
] as const

async function resolveSearchParams(searchParams: CasesPageProps['searchParams']) {
  return (await searchParams) ?? {}
}

export default async function CasesPage({ searchParams }: CasesPageProps) {
  let user

  try {
    user = await requireUser()
  } catch {
    redirect('/auth/login?next=/cases')
  }

  const filters = parseCaseListFilters(await resolveSearchParams(searchParams))
  const cases = await listAuthorizedCases({ prisma, user, filters })

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white lg:px-8">
      <section className="mx-auto max-w-6xl space-y-8">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-teal-300">Consulta protegida</p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Casos autorizados</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                No use datos reales: consulte únicamente datos sintéticos de demo local. Los filtros se aplican del lado servidor sobre el alcance RBAC del usuario autenticado.
              </p>
            </div>
            <Link href="/dashboard" className="text-sm font-semibold text-teal-200 hover:text-teal-100">
              Volver al panel
            </Link>
          </div>
        </header>

        <form action="/cases" className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-medium text-slate-200">
              Estado
              <select name="status" defaultValue={filters.status ?? ''} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white">
                <option value="">Todos</option>
                {caseStatusCatalog.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-200">
              Riesgo
              <select name="riskLevel" defaultValue={filters.riskLevel ?? ''} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white">
                <option value="">Todos</option>
                {caseRiskLevelCatalog.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-200">
              Tipo
              <select name="caseType" defaultValue={filters.caseType ?? ''} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white">
                <option value="">Todos</option>
                {caseTypeOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-200">
              Código o resumen
              <input
                name="q"
                defaultValue={filters.q ?? ''}
                maxLength={80}
                placeholder="SIPREV-DEMO..."
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white"
              />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="submit" className="rounded-full bg-teal-300 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-teal-200">
              Filtrar
            </button>
            <Link href="/cases" className="rounded-full border border-slate-600 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-teal-300">
              Limpiar filtros
            </Link>
          </div>
        </form>

        <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-300">Listado autorizado</p>
              <h2 className="mt-2 text-2xl font-bold">{cases.length} caso(s)</h2>
            </div>
          </div>
          <div className="mt-5 divide-y divide-slate-800">
            {cases.length > 0 ? (
              cases.map((caseRecord) => (
                <article key={caseRecord.publicCode} className="grid gap-3 py-5 lg:grid-cols-[1fr_auto]">
                  <div>
                    <Link href={`/cases/${caseRecord.publicCode}`} className="font-semibold text-teal-100 hover:text-teal-200">
                      {caseRecord.publicCode}
                    </Link>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{caseRecord.nonSensitiveSummary}</p>
                  </div>
                  <p className="text-sm text-slate-400">
                    {caseRecord.caseType} · {caseRecord.riskLevel} · {caseRecord.status} · {caseRecord.updatedAt.toISOString().slice(0, 10)}
                  </p>
                </article>
              ))
            ) : (
              <p className="py-5 text-sm text-slate-400">No hay casos autorizados que coincidan con los filtros.</p>
            )}
          </div>
        </section>
      </section>
    </main>
  )
}
