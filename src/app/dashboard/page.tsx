import { redirect } from 'next/navigation'

import { requireUser } from '@/lib/auth/current-user'

export default async function DashboardPage() {
  let user

  try {
    user = await requireUser()
  } catch {
    redirect('/auth/login?next=/dashboard')
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white lg:px-8">
      <section className="mx-auto max-w-6xl space-y-8">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-teal-300">Panel protegido</p>
          <h1 className="mt-4 text-3xl font-bold">Bienvenida institucional, {user.displayName}</h1>
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
            <p className="mt-3 text-sm leading-6 text-slate-300">Accesos amplios solo para roles SYSTEM_ADMIN y AUDITOR activos.</p>
          </article>
        </div>
      </section>
    </main>
  )
}
