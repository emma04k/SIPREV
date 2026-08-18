import { PrismaClient } from '@prisma/client'
import { hashSync } from 'bcryptjs'

const prisma = new PrismaClient()

const DEMO_AUTH_PASSWORD = 'SiprevDemo2026!'
const demoPasswordHash = hashSync(DEMO_AUTH_PASSWORD, 10)
const seedMarker = 'SIPREV synthetic demo seed - no real data / no use datos reales'

const institutions = [
  {
    id: 'demo-inst-central',
    code: 'SIPREV-CENTRAL-DEMO',
    name: 'SIPREV Central Demo',
    type: 'CENTRAL_ADMIN',
  },
  {
    id: 'demo-inst-comisaria-norte',
    code: 'COMISARIA-DEMO-NORTE',
    name: 'Comisaría Demo Norte',
    type: 'POLICE_STATION',
  },
  {
    id: 'demo-inst-fiscalia-control',
    code: 'FISCALIA-DEMO-CONTROL',
    name: 'Fiscalía Demo Control',
    type: 'PROSECUTOR_OFFICE',
  },
  {
    id: 'demo-inst-auditoria',
    code: 'AUDITORIA-DEMO',
    name: 'Unidad de Auditoría Demo',
    type: 'OVERSIGHT',
  },
]

const users = [
  {
    id: 'demo-user-admin',
    institutionId: 'demo-inst-central',
    email: 'admin.demo@siprev.local',
    displayName: 'Administración Demo SIPREV',
    role: 'SYSTEM_ADMIN',
  },
  {
    id: 'demo-user-comisaria',
    institutionId: 'demo-inst-comisaria-norte',
    email: 'comisaria.demo@siprev.local',
    displayName: 'Operadora Demo Comisaría',
    role: 'CASE_WORKER',
  },
  {
    id: 'demo-user-fiscalia',
    institutionId: 'demo-inst-fiscalia-control',
    email: 'fiscalia.demo@siprev.local',
    displayName: 'Fiscal Demo Control',
    role: 'PROSECUTOR',
  },
  {
    id: 'demo-user-auditor',
    institutionId: 'demo-inst-auditoria',
    email: 'auditor.demo@siprev.local',
    displayName: 'Auditoría Demo',
    role: 'AUDITOR',
  },
]

const cases = [
  {
    id: 'demo-case-001',
    publicCode: 'SIPREV-DEMO-CASE-001',
    caseType: 'POLICE_REPORT',
    violenceTypes: ['PHYSICAL', 'PSYCHOLOGICAL'],
    riskLevel: 'HIGH',
    status: 'IN_FOLLOW_UP',
    nonSensitiveSummary: 'Caso sintético de triage inicial con seguimiento interinstitucional.',
    reportingInstitutionId: 'demo-inst-comisaria-norte',
    currentInstitutionId: 'demo-inst-comisaria-norte',
    createdByUserId: 'demo-user-comisaria',
    protectedPerson: {
      id: 'demo-protected-person-001',
      demoFullName: 'Persona Demo Uno',
      demoDocumentNumber: 'DEMO-DOC-0001',
      demoBirthYear: 1996,
      demoContactNote: 'Canal de contacto demo reservado; no corresponde a una persona real.',
      demoLocationNote: 'Barrio Demo Norte, ubicación ficticia.',
    },
    aggressorReferences: [
      {
        id: 'demo-aggressor-001',
        demoAlias: 'Referencia Demo A',
        relationshipToCase: 'Vínculo familiar sintético',
        triageContext: 'Contexto de riesgo ficticio para probar separación de datos.',
      },
    ],
    events: [
      {
        id: 'demo-event-001-intake',
        category: 'INTAKE',
        title: 'Registro inicial demo',
        detail: 'Ingreso sintético del caso por institución autorizada.',
        occurredAt: new Date('2026-03-01T10:00:00.000Z'),
        actorUserId: 'demo-user-comisaria',
        institutionId: 'demo-inst-comisaria-norte',
      },
      {
        id: 'demo-event-001-risk',
        category: 'RISK_REVIEW',
        title: 'Revisión de riesgo demo',
        detail: 'Evaluación sintética marca riesgo alto para seguimiento.',
        occurredAt: new Date('2026-03-01T11:00:00.000Z'),
        actorUserId: 'demo-user-comisaria',
        institutionId: 'demo-inst-comisaria-norte',
      },
    ],
    assignments: [
      {
        id: 'demo-assignment-001-comisaria',
        institutionId: 'demo-inst-comisaria-norte',
        assignedUserId: 'demo-user-comisaria',
        status: 'ACTIVE',
        reason: 'Seguimiento local demo posterior al triage.',
      },
    ],
    auditLogs: [
      {
        id: 'demo-audit-001-seed',
        actorUserId: 'demo-user-admin',
        actorInstitutionId: 'demo-inst-central',
        action: 'SEED',
        entityType: 'Case',
        metadata: { seedMarker, publicCode: 'SIPREV-DEMO-CASE-001' },
      },
      {
        id: 'demo-audit-001-create',
        actorUserId: 'demo-user-comisaria',
        actorInstitutionId: 'demo-inst-comisaria-norte',
        action: 'CREATE',
        entityType: 'Case',
        metadata: { seedMarker, publicCode: 'SIPREV-DEMO-CASE-001' },
      },
    ],
  },
  {
    id: 'demo-case-002',
    publicCode: 'SIPREV-DEMO-CASE-002',
    caseType: 'PROSECUTOR_REFERRAL',
    violenceTypes: ['DIGITAL', 'ECONOMIC'],
    riskLevel: 'MEDIUM',
    status: 'REFERRED',
    nonSensitiveSummary: 'Caso sintético referido a fiscalía para coordinación demo.',
    reportingInstitutionId: 'demo-inst-comisaria-norte',
    currentInstitutionId: 'demo-inst-fiscalia-control',
    createdByUserId: 'demo-user-fiscalia',
    protectedPerson: {
      id: 'demo-protected-person-002',
      demoFullName: 'Persona Demo Dos',
      demoDocumentNumber: 'DEMO-DOC-0002',
      demoBirthYear: 1988,
      demoContactNote: 'Contacto demo documentado solo como nota ficticia.',
      demoLocationNote: 'Municipio Demo Control, ubicación ficticia.',
    },
    aggressorReferences: [
      {
        id: 'demo-aggressor-002',
        demoAlias: 'Referencia Demo B',
        relationshipToCase: 'Vínculo laboral sintético',
        triageContext: 'Contexto digital y económico ficticio para demo.',
      },
    ],
    events: [
      {
        id: 'demo-event-002-intake',
        category: 'INTAKE',
        title: 'Registro de referencia demo',
        detail: 'Ingreso sintético por referencia institucional.',
        occurredAt: new Date('2026-03-02T09:30:00.000Z'),
        actorUserId: 'demo-user-fiscalia',
        institutionId: 'demo-inst-fiscalia-control',
      },
      {
        id: 'demo-event-002-referral',
        category: 'REFERRAL',
        title: 'Remisión fiscalía demo',
        detail: 'Caso sintético remitido para control y seguimiento.',
        occurredAt: new Date('2026-03-02T10:30:00.000Z'),
        actorUserId: 'demo-user-fiscalia',
        institutionId: 'demo-inst-fiscalia-control',
      },
    ],
    assignments: [
      {
        id: 'demo-assignment-002-fiscalia',
        institutionId: 'demo-inst-fiscalia-control',
        assignedUserId: 'demo-user-fiscalia',
        status: 'ACTIVE',
        reason: 'Coordinación fiscal demo.',
      },
      {
        id: 'demo-assignment-002-auditoria',
        institutionId: 'demo-inst-auditoria',
        assignedUserId: 'demo-user-auditor',
        status: 'ACTIVE',
        reason: 'Observación de trazabilidad demo.',
      },
    ],
    auditLogs: [
      {
        id: 'demo-audit-002-seed',
        actorUserId: 'demo-user-admin',
        actorInstitutionId: 'demo-inst-central',
        action: 'SEED',
        entityType: 'Case',
        metadata: { seedMarker, publicCode: 'SIPREV-DEMO-CASE-002' },
      },
      {
        id: 'demo-audit-002-refer',
        actorUserId: 'demo-user-fiscalia',
        actorInstitutionId: 'demo-inst-fiscalia-control',
        action: 'REFER',
        entityType: 'Case',
        metadata: { seedMarker, publicCode: 'SIPREV-DEMO-CASE-002' },
      },
    ],
  },
]

async function main() {
  for (const institution of institutions) {
    await prisma.institution.upsert({
      where: { code: institution.code },
      update: {
        name: institution.name,
        type: institution.type,
        status: 'ACTIVE',
      },
      create: {
        ...institution,
        status: 'ACTIVE',
      },
    })
  }

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        institutionId: user.institutionId,
        displayName: user.displayName,
        role: user.role,
        status: 'ACTIVE',
        passwordHash: demoPasswordHash,
        authProviderSubject: `credentials:${user.email}`,
      },
      create: {
        ...user,
        status: 'ACTIVE',
        passwordHash: demoPasswordHash,
        authProviderSubject: `credentials:${user.email}`,
      },
    })
  }

  for (const caseFixture of cases) {
    const record = await prisma.case.upsert({
      where: { publicCode: caseFixture.publicCode },
      update: {
        caseType: caseFixture.caseType,
        violenceTypes: caseFixture.violenceTypes,
        riskLevel: caseFixture.riskLevel,
        status: caseFixture.status,
        nonSensitiveSummary: caseFixture.nonSensitiveSummary,
        reportingInstitutionId: caseFixture.reportingInstitutionId,
        currentInstitutionId: caseFixture.currentInstitutionId,
        createdByUserId: caseFixture.createdByUserId,
      },
      create: {
        id: caseFixture.id,
        publicCode: caseFixture.publicCode,
        caseType: caseFixture.caseType,
        violenceTypes: caseFixture.violenceTypes,
        riskLevel: caseFixture.riskLevel,
        status: caseFixture.status,
        nonSensitiveSummary: caseFixture.nonSensitiveSummary,
        reportingInstitutionId: caseFixture.reportingInstitutionId,
        currentInstitutionId: caseFixture.currentInstitutionId,
        createdByUserId: caseFixture.createdByUserId,
      },
    })

    await prisma.auditLog.deleteMany({ where: { caseId: record.id } })
    await prisma.caseAssignment.deleteMany({ where: { caseId: record.id } })
    await prisma.caseEvent.deleteMany({ where: { caseId: record.id } })
    await prisma.aggressorReference.deleteMany({ where: { caseId: record.id } })
    await prisma.protectedPerson.deleteMany({ where: { caseId: record.id } })

    await prisma.protectedPerson.create({
      data: {
        ...caseFixture.protectedPerson,
        caseId: record.id,
      },
    })

    await prisma.aggressorReference.createMany({
      data: caseFixture.aggressorReferences.map((reference) => ({
        ...reference,
        caseId: record.id,
      })),
    })

    await prisma.caseEvent.createMany({
      data: caseFixture.events.map((event) => ({
        ...event,
        caseId: record.id,
      })),
    })

    await prisma.caseAssignment.createMany({
      data: caseFixture.assignments.map((assignment) => ({
        ...assignment,
        caseId: record.id,
      })),
    })

    await prisma.auditLog.createMany({
      data: caseFixture.auditLogs.map((auditLog) => ({
        ...auditLog,
        caseId: record.id,
        entityId: record.id,
      })),
    })
  }

  const counts = {
    institutions: await prisma.institution.count(),
    users: await prisma.user.count(),
    cases: await prisma.case.count(),
    protectedPersons: await prisma.protectedPerson.count(),
    events: await prisma.caseEvent.count(),
    assignments: await prisma.caseAssignment.count(),
    auditLogs: await prisma.auditLog.count(),
  }

  console.info('SIPREV Phase 2 synthetic seed loaded:', counts)
}

main()
  .catch((error) => {
    console.error('SIPREV Phase 2 seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
