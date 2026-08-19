'use client'

import { useState, type FormEvent } from 'react'

import { caseStatusCatalog } from '@/lib/domain-catalogs'

type FollowUpFormProps = {
  publicCode: string
  currentStatus: string
}

const categoryOptions = [
  { value: 'FOLLOW_UP', label: 'Seguimiento' },
  { value: 'RISK_REVIEW', label: 'Revisión de riesgo' },
  { value: 'STATUS_CHANGE', label: 'Cambio de estado' },
  { value: 'REFERRAL', label: 'Remisión' },
] as const

export function FollowUpForm({ publicCode, currentStatus }: FollowUpFormProps) {
  const [message, setMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const endpoint = `/api/cases/${publicCode}/events`
    const newStatus = String(formData.get('newStatus') ?? '')

    setIsSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          category: formData.get('category'),
          title: formData.get('title'),
          detail: formData.get('detail'),
          ...(newStatus ? { newStatus } : {}),
        }),
      })

      if (!response.ok) {
        setMessage('No fue posible registrar el seguimiento. Revise los datos sintéticos e intente de nuevo.')
        return
      }

      form.reset()
      setMessage('Seguimiento sintético registrado. Recargue la página para ver la línea de tiempo actualizada.')
    } catch {
      setMessage('No fue posible registrar el seguimiento. Intente de nuevo más tarde.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-300">Seguimiento</p>
        <h2 className="mt-2 text-2xl font-bold">Registrar seguimiento demo</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          No use datos reales: este formulario acepta solo notas sintéticas para la demo local.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-200">
          Categoría
          <select name="category" required defaultValue="FOLLOW_UP" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white">
            {categoryOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-200">
          Nuevo estado opcional
          <select name="newStatus" defaultValue="" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white">
            <option value="">Mantener {currentStatus}</option>
            {caseStatusCatalog.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-4">
        <label className="text-sm font-medium text-slate-200">
          Título
          <input name="title" required maxLength={120} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white" />
        </label>
        <label className="text-sm font-medium text-slate-200">
          Detalle sintético
          <textarea name="detail" required maxLength={1000} rows={5} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white" />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button disabled={isSubmitting} type="submit" className="rounded-full bg-teal-300 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60">
          {isSubmitting ? 'Registrando…' : 'Registrar seguimiento'}
        </button>
        {message ? (
          <p role="status" aria-live="polite" className="text-sm text-slate-300">
            {message}
          </p>
        ) : null}
      </div>
    </form>
  )
}
