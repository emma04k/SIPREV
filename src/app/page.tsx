import { getDemoGuardrails, siteConfig } from '@/lib/site-config'

const pilotCapabilities = [
  'Registro centralizado de casos con código no sensible',
  'Continuidad del historial entre instituciones autorizadas',
  'Roles demo preparados para RBAC y evolución a ABAC',
  'Auditoría prevista para consultas, cambios y seguimientos',
]

const foundationModules = [
  {
    title: 'Base desplegable',
    body: 'Next.js App Router, TypeScript y Tailwind CSS listos para Vercel.',
  },
  {
    title: 'Datos preparados',
    body: 'Prisma queda configurado para PostgreSQL/Neon sin exigir credenciales reales en build.',
  },
  {
    title: 'Seguridad desde el día uno',
    body: 'Sin registro público, sin datos reales y con Auth.js reservado para la fase de autenticación.',
  },
]

export default function Home() {
  const guardrails = getDemoGuardrails()

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative isolate overflow-hidden px-6 py-10 sm:py-14 lg:px-8">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.25),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.22),_transparent_35%)]" />
        <div className="mx-auto flex max-w-6xl flex-col gap-12">
          <header className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-teal-300">Piloto educativo</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">{siteConfig.title}</h1>
            </div>
            <div className="rounded-full border border-teal-300/30 bg-teal-300/10 px-5 py-2 text-sm font-medium text-teal-100">
              Acceso institucional controlado
            </div>
          </header>

          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-8">
              <div className="space-y-5">
                <p className="max-w-3xl text-xl leading-8 text-slate-200">{siteConfig.description}</p>
                <p className="max-w-3xl text-base leading-7 text-slate-300">
                  SIPREV no es una demo pública de datos reales. Es una base técnica seria para explicar cómo un sistema protegido podría reducir la fragmentación de información sensible entre entidades competentes.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {pilotCapabilities.map((capability) => (
                  <div key={capability} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100 shadow-2xl shadow-black/10">
                    {capability}
                  </div>
                ))}
              </div>
            </div>

            <aside className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/30 backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-200">Advertencia de reserva</p>
              <h2 className="mt-3 text-2xl font-semibold">Demo sin datos reales</h2>
              <ul className="mt-6 space-y-3 text-sm leading-6 text-slate-100">
                {guardrails.map((guardrail) => (
                  <li key={guardrail} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 flex-none rounded-full bg-teal-300" />
                    <span>{guardrail}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-slate-900 px-6 py-12 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {foundationModules.map((module) => (
            <article key={module.title} className="rounded-3xl border border-slate-700 bg-slate-950/80 p-6">
              <h2 className="text-xl font-semibold text-teal-100">{module.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{module.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
