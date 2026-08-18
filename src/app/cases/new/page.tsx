import Link from 'next/link'
import { redirect } from 'next/navigation'

import { requireUser } from '@/lib/auth/current-user'
import { createCaseInputSchema } from '@/lib/cases/case-input'
import { createCase, userCanCreateCase, type CaseCreationPrismaClient } from '@/lib/cases/create-case'
import { caseRiskLevelCatalog, demoDataBoundary, violenceTypeCatalog } from '@/lib/domain-catalogs'
import { prisma } from '@/lib/prisma'

type NewCasePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}

async function resolveSearchParams(searchParams: NewCasePageProps['searchParams']) {
  return searchParams ? await searchParams : {}
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function optionalFormText(formData: FormData, key: string): string | undefined {
  const value = formData.get(key)

  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()

  return trimmed === '' ? undefined : trimmed
}

function formText(formData: FormData, key: string): string {
  return optionalFormText(formData, key) ?? ''
}

function optionalBirthYear(formData: FormData): number | undefined {
  const value = optionalFormText(formData, 'protectedPerson.demoBirthYear')

  if (!value) {
    return undefined
  }

  return Number.parseInt(value, 10)
}

function formDataToInput(formData: FormData) {
  const aggressorAlias = optionalFormText(formData, 'aggressorReference.demoAlias')
  const aggressorReference = aggressorAlias
    ? {
        demoAlias: aggressorAlias,
        relationshipToCase: optionalFormText(formData, 'aggressorReference.relationshipToCase'),
        triageContext: optionalFormText(formData, 'aggressorReference.triageContext'),
      }
    : undefined

  return createCaseInputSchema.parse({
    caseType: formText(formData, 'caseType'),
    violenceTypes: formData.getAll('violenceTypes').filter((value): value is string => typeof value === 'string'),
    riskLevel: formText(formData, 'riskLevel'),
    nonSensitiveSummary: formText(formData, 'nonSensitiveSummary'),
    protectedPerson: {
      demoFullName: formText(formData, 'protectedPerson.demoFullName'),
      demoDocumentNumber: formText(formData, 'protectedPerson.demoDocumentNumber'),
      demoBirthYear: optionalBirthYear(formData),
      demoContactNote: optionalFormText(formData, 'protectedPerson.demoContactNote'),
      demoLocationNote: optionalFormText(formData, 'protectedPerson.demoLocationNote'),
    },
    aggressorReference,
    initialEvent: {
      title: formText(formData, 'initialEvent.title'),
      detail: formText(formData, 'initialEvent.detail'),
    },
  })
}

async function registerCase(formData: FormData) {
  'use server'

  let actor

  try {
    actor = await requireUser()
  } catch {
    redirect('/auth/login?next=/cases/new')
  }

  if (!userCanCreateCase(actor)) {
    redirect('/cases/new?error=forbidden')
  }

  let created

  try {
    const input = formDataToInput(formData)
    created = await createCase({
      prisma: prisma as unknown as CaseCreationPrismaClient,
      actor,
      input,
    })
  } catch {
    redirect('/cases/new?error=case-registration')
  }

  redirect(`/cases/new?created=${encodeURIComponent(created.publicCode)}`)
}

export default async function NewCasePage({ searchParams }: NewCasePageProps) {
  let user

  try {
    user = await requireUser()
  } catch {
    redirect('/auth/login?next=/cases/new')
  }

  const params = await resolveSearchParams(searchParams)
  const createdCode = firstParam(params.created)
  const error = firstParam(params.error)

  if (!userCanCreateCase(user)) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white lg:px-8">
        <section className="mx-auto max-w-3xl rounded-3xl border border-rose-400/40 bg-rose-400/10 p-8 text-rose-50">
          <p className="text-sm font-semibold uppercase tracking-[0.3em]">403 · Acceso restringido</p>
          <h1 className="mt-4 text-3xl font-bold">No autorizado para registrar casos</h1>
          <p className="mt-4 text-sm leading-6">
            Su rol institucional no tiene permisos para registrar casos protegidos. Puede volver al panel para consultar
            únicamente los recursos permitidos por RBAC.
          </p>
          <Link href="/dashboard" className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-rose-50">
            Volver al panel
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white lg:px-8">
      <section className="mx-auto max-w-5xl space-y-8">
        <header className="rounded-3xl border border-teal-400/30 bg-teal-400/10 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-teal-200">Nuevo caso protegido</p>
          <h1 className="mt-4 text-3xl font-bold">Registrar nuevo caso SIPREV</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-teal-50">
            {demoDataBoundary.warning} Este flujo es solo para demo local institucional; no use datos reales ni documentos,
            teléfonos, direcciones o nombres verdaderos. No existe registro público ni autoservicio ciudadano.
          </p>
          <p className="mt-3 text-sm text-slate-200">
            Sesión institucional: {user.displayName} · {user.institutionCode}. Smoke JSON disponible en /api/cases.
          </p>
        </header>

        {createdCode ? (
          <div role="status" className="rounded-3xl border border-emerald-400/40 bg-emerald-400/10 p-6 text-emerald-50">
            <p className="text-sm font-semibold uppercase tracking-[0.25em]">Caso registrado</p>
            <p className="mt-2 text-2xl font-bold">Código del caso: {createdCode}</p>
            <p className="mt-2 text-sm">Use este código no sensible para validar que el caso aparece en el panel.</p>
          </div>
        ) : null}

        {error ? (
          <div role="alert" className="rounded-3xl border border-rose-400/40 bg-rose-400/10 p-6 text-rose-50">
            No fue posible registrar el caso. Revise campos sintéticos obligatorios y permisos institucionales.
          </div>
        ) : null}

        <form action={registerCase} className="space-y-6 rounded-3xl border border-white/10 bg-slate-900 p-8">
          <div className="grid gap-5 md:grid-cols-3">
            <label className="space-y-2 text-sm font-medium text-slate-200">
              Tipo de caso
              <select name="caseType" required className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white">
                <option value="INITIAL_REPORT">Reporte inicial</option>
                <option value="POLICE_REPORT">Reporte policial</option>
                <option value="PROSECUTOR_REFERRAL">Remisión fiscalía</option>
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-200">
              Riesgo
              <select name="riskLevel" required className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white">
                {caseRiskLevelCatalog.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2 text-sm font-medium text-slate-200">
              Violencias reportadas
              <div className="grid gap-2 rounded-xl border border-slate-700 bg-slate-950 p-3">
                {violenceTypeCatalog.map((item) => (
                  <label key={item.value} className="flex items-center gap-2 text-xs text-slate-200">
                    <input name="violenceTypes" type="checkbox" value={item.value} className="accent-teal-300" />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <label className="block space-y-2 text-sm font-medium text-slate-200">
            Resumen no sensible del caso
            <textarea
              name="nonSensitiveSummary"
              required
              maxLength={500}
              className="min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white"
              placeholder="Describa señales generales sintéticas, sin datos personales reales."
            />
          </label>

          <fieldset className="grid gap-5 rounded-2xl border border-slate-700 p-5 md:grid-cols-2">
            <legend className="px-2 text-sm font-semibold text-teal-100">Persona protegida demo</legend>
            <label className="space-y-2 text-sm font-medium text-slate-200">
              Nombre sintético
              <input name="protectedPerson.demoFullName" required maxLength={160} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white" />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-200">
              Documento demo
              <input name="protectedPerson.demoDocumentNumber" required maxLength={80} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white" />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-200">
              Año de nacimiento demo
              <input name="protectedPerson.demoBirthYear" type="number" min="1900" max="2026" className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white" />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-200">
              Nota de contacto ficticia
              <input name="protectedPerson.demoContactNote" maxLength={500} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white" />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-200 md:col-span-2">
              Nota de ubicación ficticia
              <input name="protectedPerson.demoLocationNote" maxLength={500} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white" />
            </label>
          </fieldset>

          <fieldset className="grid gap-5 rounded-2xl border border-slate-700 p-5 md:grid-cols-2">
            <legend className="px-2 text-sm font-semibold text-teal-100">Referencia agresora opcional demo</legend>
            <label className="space-y-2 text-sm font-medium text-slate-200">
              Alias sintético
              <input name="aggressorReference.demoAlias" maxLength={160} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white" />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-200">
              Relación sintética
              <input name="aggressorReference.relationshipToCase" maxLength={160} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white" />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-200 md:col-span-2">
              Contexto de triage ficticio
              <textarea name="aggressorReference.triageContext" maxLength={500} className="min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white" />
            </label>
          </fieldset>

          <fieldset className="grid gap-5 rounded-2xl border border-slate-700 p-5 md:grid-cols-2">
            <legend className="px-2 text-sm font-semibold text-teal-100">Primer evento de timeline</legend>
            <label className="space-y-2 text-sm font-medium text-slate-200">
              Título del evento
              <input name="initialEvent.title" required maxLength={120} defaultValue="Recepción inicial demo" className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white" />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-200 md:col-span-2">
              Detalle del evento
              <textarea name="initialEvent.detail" required maxLength={500} className="min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white" />
            </label>
          </fieldset>

          <button type="submit" className="rounded-full bg-teal-300 px-6 py-3 font-semibold text-slate-950 hover:bg-teal-200">
            Registrar caso demo protegido
          </button>
        </form>
      </section>
    </main>
  )
}
