export type CatalogItem<TValue extends string> = {
  value: TValue
  label: string
  description: string
}

// SIPREV Phase 2 catalogs are synthetic/demo-only. No use datos reales in
// fixtures, labels, examples, or tests until a future legally reviewed phase.
export const demoDataBoundary = {
  isSynthetic: true,
  warning: 'No use datos reales: estos catálogos y fixtures son sintéticos para demo local.',
} as const

export const violenceTypeCatalog = [
  {
    value: 'PHYSICAL',
    label: 'Física',
    description: 'Indicadores sintéticos de agresión física reportada.',
  },
  {
    value: 'PSYCHOLOGICAL',
    label: 'Psicológica',
    description: 'Indicadores sintéticos de amenaza, coerción o daño emocional.',
  },
  {
    value: 'SEXUAL',
    label: 'Sexual',
    description: 'Indicadores sintéticos de violencia sexual para triage protegido.',
  },
  {
    value: 'ECONOMIC',
    label: 'Económica',
    description: 'Indicadores sintéticos de control financiero o patrimonial.',
  },
  {
    value: 'DIGITAL',
    label: 'Digital',
    description: 'Indicadores sintéticos de acoso o control mediante canales digitales.',
  },
  {
    value: 'INSTITUTIONAL',
    label: 'Institucional',
    description: 'Indicadores sintéticos de barreras de atención institucional.',
  },
] as const satisfies readonly CatalogItem<string>[]

export const caseRiskLevelCatalog = [
  {
    value: 'LOW',
    label: 'Bajo',
    description: 'Caso de seguimiento ordinario sin señales críticas en la demo.',
  },
  {
    value: 'MEDIUM',
    label: 'Medio',
    description: 'Caso sintético con alertas que requieren continuidad interinstitucional.',
  },
  {
    value: 'HIGH',
    label: 'Alto',
    description: 'Caso sintético priorizado por señales de escalamiento.',
  },
  {
    value: 'CRITICAL',
    label: 'Crítico',
    description: 'Caso sintético con atención inmediata y auditoría reforzada.',
  },
] as const satisfies readonly CatalogItem<string>[]

export const caseStatusCatalog = [
  {
    value: 'OPEN',
    label: 'Abierto',
    description: 'Registro creado y pendiente de gestión inicial.',
  },
  {
    value: 'IN_FOLLOW_UP',
    label: 'En seguimiento',
    description: 'Caso con eventos activos de seguimiento institucional.',
  },
  {
    value: 'REFERRED',
    label: 'Referido',
    description: 'Caso remitido a otra institución autorizada.',
  },
  {
    value: 'CLOSED',
    label: 'Cerrado',
    description: 'Caso cerrado administrativamente en la demo.',
  },
] as const satisfies readonly CatalogItem<string>[]

export function getCatalogGuardrails(): string[] {
  return [
    demoDataBoundary.warning,
    'Los campos personales protegidos viven fuera del registro público del caso.',
    'Los valores de catálogo deben mantenerse alineados con los enums de Prisma.',
  ]
}
