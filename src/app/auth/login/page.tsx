import { AuthError } from 'next-auth'
import { redirect } from 'next/navigation'

import { signIn } from '../../../../auth'
import { DEMO_AUTH_PASSWORD } from '@/lib/auth/credentials'
import { safeRedirectPath } from '@/lib/auth/redirect'

type LoginPageProps = {
  searchParams?: Promise<{ error?: string; next?: string }> | { error?: string; next?: string }
}

async function resolveSearchParams(searchParams: LoginPageProps['searchParams']) {
  return searchParams ? await searchParams : {}
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await resolveSearchParams(searchParams)
  const nextPath = safeRedirectPath(params.next)
  const hasError = Boolean(params.error)
  const demoPasswordLiteral = 'SiprevDemo2026!'

  async function authenticate(formData: FormData) {
    'use server'

    const redirectTo = safeRedirectPath(formData.get('next'))

    try {
      await signIn('credentials', {
        email: formData.get('email'),
        password: formData.get('password'),
        redirectTo,
      })
    } catch (error) {
      if (error instanceof AuthError) {
        redirect(`/auth/login?error=CredentialsSignin&next=${encodeURIComponent(redirectTo)}`)
      }

      throw error
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white lg:px-8">
      <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-teal-300">Acceso institucional</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">Iniciar sesión en SIPREV</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Piloto educativo con datos sintéticos. No existe registro público: las cuentas son precreadas por seed local o administración institucional.
          </p>

          {hasError ? (
            <div className="mt-6 rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100" role="alert">
              No fue posible iniciar sesión. Revise las credenciales institucionales demo.
            </div>
          ) : null}

          <form action={authenticate} className="mt-8 space-y-5">
            <input type="hidden" name="next" value={nextPath} />
            <label className="block text-sm font-medium text-slate-100">
              Correo institucional
              <input
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none ring-teal-300/40 focus:ring-4"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue="comisaria.demo@siprev.local"
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-100">
              Contraseña demo local
              <input
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none ring-teal-300/40 focus:ring-4"
                name="password"
                type="password"
                autoComplete="current-password"
                defaultValue={DEMO_AUTH_PASSWORD}
                required
              />
            </label>
            <button className="w-full rounded-2xl bg-teal-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-teal-200" type="submit">
              Iniciar sesión
            </button>
          </form>
        </div>

        <aside className="rounded-3xl border border-amber-300/30 bg-amber-300/10 p-6 text-amber-50">
          <h2 className="text-xl font-semibold">Advertencia de demo educativo</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6">
            <li>Use solo datos sintéticos; SIPREV local no debe recibir información real.</li>
            <li>Contraseña local compartida para todas las cuentas seed: {demoPasswordLiteral}</li>
            <li>Sin registro público ni recuperación autoservicio en esta fase.</li>
          </ul>
        </aside>
      </section>
    </main>
  )
}
