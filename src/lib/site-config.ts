export type SiteConfig = {
  name: 'SIPREV'
  title: string
  description: string
  isEducationalDemo: true
  allowsPublicRegistration: false
  reservedAuthPhase: 'phase-3'
  repositoryWarning: string
}

export const siteConfig: SiteConfig = {
  name: 'SIPREV',
  title: 'SIPREV — Sistema Protegido de Registro de Violencia',
  description:
    'Piloto educativo para demostrar registro protegido, continuidad interinstitucional y trazabilidad de casos con datos sintéticos.',
  isEducationalDemo: true,
  allowsPublicRegistration: false,
  reservedAuthPhase: 'phase-3',
  repositoryWarning:
    'No use datos reales: este piloto educativo requiere validación jurídica, seguridad avanzada y acuerdos institucionales antes de producción.',
}

export function getDemoGuardrails(): string[] {
  return [
    'Solo datos sintéticos',
    'Sin registro público: cuentas institucionales creadas por administración',
    'Credenciales, sesiones y roles se implementarán con Auth.js en la Fase 3',
    'DATABASE_URL de Neon debe vivir únicamente en variables de entorno del servidor',
    'Producción requiere revisión legal, cifrado, auditoría fuerte y operación segura',
  ]
}
