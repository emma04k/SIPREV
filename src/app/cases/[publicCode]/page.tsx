import { notFound, redirect } from 'next/navigation'

import { recordSensitiveCaseView } from '@/lib/audit-log'
import { canAccessCase } from '@/lib/auth/permissions'
import { requireUser } from '@/lib/auth/current-user'
import { demoDataBoundary } from '@/lib/domain-catalogs'
import { prisma } from '@/lib/prisma'
import { FollowUpForm } from './follow-up-form'

export const dynamic = 'force-dynamic'

type CaseDetailPageProps = {
  params: Promise<{ publicCode: string }> | { publicCode: string }
}

async function resolveParams(params: CaseDetailPageProps['params']) {
  return await params
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { publicCode } = await resolveParams(params)
  let user

  try {
    user = await requireUser()
  } catch {
    redirect(`/auth/login?next=/cases/${publicCode}`)
  }

  const caseRecord = await prisma.case.findUnique({
    where: { publicCode },
    select: {
      id: true,
      publicCode: true,
      caseType: true,
      violenceTypes: true,
      riskLevel: true,
      status: true,
      nonSensitiveSummary: true,
      reportingInstitutionId: true,
      currentInstitutionId: true,
      protectedPerson: {
        select: {
          demoFullName: true,
          demoDocumentNumber: true,
          demoBirthYear: true,
          demoContactNote: true,
          demoLocationNote: true,
        },
      },
      assignments: {
        select: {
          institutionId: true,
          assignedUserId: true,
          status: true,
        },
      },
      events: {
        orderBy: { occurredAt: 'asc' },
        select: {
          id: true,
          category: true,
          title: true,
          detail: true,
          occurredAt: true,
          institutionId: true,
        },
      },
    },
  })

  if (!caseRecord) {
    notFound()
  }

  if (!canAccessCase(user, caseRecord)) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white lg:px-8">
        <section className="mx-auto max-w-3xl rounded-3xl border border-red-400/30 bg-red-950/30 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-200">403</p>
          <h1 className="mt-3 text-3xl font-bold">No autorizado</h1>
          <p className="mt-3 text-sm leading-6 text-red-100">Su usuario autenticado no tiene acceso a este caso protegido.</p>
        </section>
      </main>
    )
  }

  try {
    await recordSensitiveCaseView({ prisma, actor: user, caseRecord })
  } catch (error) {
    console.error('Failed to record sensitive case VIEW audit', error)

    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white lg:px-8">
        <section className="mx-auto max-w-3xl rounded-3xl border border-amber-300/30 bg-amber-950/30 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-200">Auditoría requerida</p>
          <h1 className="mt-3 text-3xl font-bold">No fue posible registrar la consulta</h1>
          <p className="mt-3 text-sm leading-6 text-amber-100">Por seguridad, la consulta falla cerrada cuando no se puede auditar el acceso.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white lg:px-8">
      <section className="mx-auto max-w-6xl space-y-8">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-teal-300">Detalle protegido</p>
          <h1 className="mt-3 text-3xl font-bold">{caseRecord.publicCode}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            {demoDataBoundary.warning} La consulta registra auditoría VIEW del lado servidor.
          </p>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <article className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold text-teal-100">Resumen no sensible</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">{caseRecord.nonSensitiveSummary}</p>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-400">Tipo</dt>
                <dd className="mt-1 font-semibold text-slate-100">{caseRecord.caseType}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Riesgo</dt>
                <dd className="mt-1 font-semibold text-slate-100">{caseRecord.riskLevel}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Estado</dt>
                <dd className="mt-1 font-semibold text-slate-100">{caseRecord.status}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Violencias</dt>
                <dd className="mt-1 font-semibold text-slate-100">{caseRecord.violenceTypes.join(', ')}</dd>
              </div>
            </dl>
          </article>

          <article className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold text-teal-100">Persona protegida demo</h2>
            {caseRecord.protectedPerson ? (
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-slate-400">Nombre sintético</dt>
                  <dd className="font-semibold text-slate-100">{caseRecord.protectedPerson.demoFullName}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Documento demo</dt>
                  <dd className="font-semibold text-slate-100">{caseRecord.protectedPerson.demoDocumentNumber}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Año de nacimiento demo</dt>
                  <dd className="font-semibold text-slate-100">{caseRecord.protectedPerson.demoBirthYear ?? 'No informado'}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-slate-400">Sin persona protegida asociada.</p>
            )}
          </article>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-300">Línea de tiempo</p>
          <h2 className="mt-2 text-2xl font-bold">Historial autorizado</h2>
          <ol className="mt-6 space-y-4">
            {caseRecord.events.map((event) => (
              <li key={event.id} className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-teal-300">{event.category}</p>
                <h3 className="mt-2 font-semibold text-slate-100">{event.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{event.detail}</p>
                <p className="mt-3 text-xs text-slate-500">{event.occurredAt.toISOString()}</p>
              </li>
            ))}
          </ol>
        </section>

        <FollowUpForm publicCode={publicCode} currentStatus={caseRecord.status} />
      </section>
    </main>
  )
}
