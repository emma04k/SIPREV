import Link from 'next/link'
import { redirect } from 'next/navigation'

import { requireUser } from '@/lib/auth/current-user'
import {
  listAuditLogEntries,
  parseAuditLogFilters,
  userCanViewAudit,
  type AuditLogPrismaClient,
} from '@/lib/audit/audit-log-query'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type AuditPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}

const actionOptions = ['CREATE', 'VIEW', 'UPDATE', 'ASSIGN', 'REFER', 'CLOSE', 'SEED'] as const

async function resolveSearchParams(searchParams: AuditPageProps['searchParams']) {
  return (await searchParams) ?? {}
}

function metadataPreview(metadata: unknown): string {
  return JSON.stringify(metadata ?? {}, null, 2)
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  let user

  try {
    user = await requireUser()
  } catch {
    redirect('/auth/login?next=/audit')
  }

  if (!userCanViewAudit(user)) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8 lg:py-10">
        <section className="mx-auto max-w-3xl rounded-3xl border border-rose-400/40 bg-rose-400/10 p-6 text-rose-50 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em]">403 · Acceso restringido</p>
          <h1 className="mt-4 text-3xl font-bold">No autorizado para consultar auditoría</h1>
          <p className="mt-4 text-sm leading-6">
            La bitácora administrativa solo está disponible para roles SYSTEM_ADMIN y AUDITOR activos en instituciones activas.
            Vuelva al panel para continuar con los recursos permitidos por RBAC.
          </p>
          <Link href="/dashboard" className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-rose-50">
            Volver al panel
          </Link>
        </section>
      </main>
    )
  }

  const filters = parseAuditLogFilters(await resolveSearchParams(searchParams))
  const auditEntries = await listAuditLogEntries({ prisma: prisma as unknown as AuditLogPrismaClient, filters })

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8 lg:py-10">
      <section className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-teal-300">Auditoría administrativa</p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Bitácora SIPREV demo</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                Consulta bajo reserva legal y control institucional. No use datos reales: esta vista muestra trazabilidad
                sanitizada de datos sintéticos, limitada a los últimos 100 registros y sin cuerpos enviados.
              </p>
            </div>
            <nav className="flex flex-wrap gap-3" aria-label="Navegación de auditoría">
              <Link href="/dashboard" className="inline-flex rounded-full border border-teal-300 px-5 py-3 text-sm font-semibold text-teal-100 hover:bg-teal-300/10">
                Volver al panel
              </Link>
              <Link href="/cases" className="inline-flex rounded-full bg-teal-300 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-teal-200">
                Consultar casos
              </Link>
            </nav>
          </div>
        </header>

        <form action="/audit" className="rounded-3xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm font-medium text-slate-200">
              Acción
              <select name="action" defaultValue={filters.action ?? ''} className="mt-2 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white">
                <option value="">Todas</option>
                {actionOptions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-200">
              Entidad
              <input
                name="entityType"
                defaultValue={filters.entityType ?? ''}
                maxLength={120}
                placeholder="Case"
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white"
              />
            </label>
            <label className="text-sm font-medium text-slate-200">
              Código público del caso
              <input
                name="publicCode"
                defaultValue={filters.publicCode ?? ''}
                maxLength={120}
                placeholder="SIPREV-DEMO-CASE-001"
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white"
              />
            </label>
            <label className="text-sm font-medium text-slate-200">
              Actor o institución
              <input
                name="actor"
                defaultValue={filters.actor ?? ''}
                maxLength={120}
                placeholder="auditor.demo@siprev.local"
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white"
              />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="submit" className="rounded-full bg-teal-300 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-teal-200">
              Filtrar auditoría
            </button>
            <Link href="/audit" className="rounded-full border border-slate-600 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-teal-300">
              Limpiar filtros
            </Link>
          </div>
        </form>

        <section className="rounded-3xl border border-white/10 bg-slate-900 p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-300">Últimos 100 registros</p>
              <h2 className="mt-2 text-2xl font-bold">{auditEntries.length} evento(s) de auditoría</h2>
            </div>
            <p className="text-sm text-slate-400">Metadatos sanitizados antes de renderizar.</p>
          </div>

          <div className="mt-6 overflow-x-auto">
            {auditEntries.length > 0 ? (
              <table className="min-w-[920px] divide-y divide-slate-800 text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  <tr>
                    <th className="py-3 pr-4">Fecha</th>
                    <th className="px-4 py-3">Acción</th>
                    <th className="px-4 py-3">Entidad</th>
                    <th className="px-4 py-3">Caso</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Institución</th>
                    <th className="py-3 pl-4">Metadatos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {auditEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-4 pr-4 align-top text-xs text-slate-400">{entry.createdAt}</td>
                      <td className="px-4 py-4 align-top font-semibold text-teal-100">{entry.action}</td>
                      <td className="px-4 py-4 align-top">{entry.entityType}</td>
                      <td className="px-4 py-4 align-top font-mono text-xs text-teal-200">{entry.publicCode ?? '—'}</td>
                      <td className="px-4 py-4 align-top text-xs leading-5 text-slate-300">{entry.actor}</td>
                      <td className="px-4 py-4 align-top text-xs leading-5 text-slate-300">{entry.institution}</td>
                      <td className="py-4 pl-4 align-top">
                        <pre className="max-w-sm whitespace-pre-wrap rounded-2xl border border-slate-800 bg-slate-950 p-3 text-xs leading-5 text-slate-300">
                          {metadataPreview(entry.metadata)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">
                No hay eventos de auditoría que coincidan con los filtros. Ajuste los criterios o vuelva al flujo demo end-to-end.
              </p>
            )}
          </div>
        </section>
      </section>
    </main>
  )
}
