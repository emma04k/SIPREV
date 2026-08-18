import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const minimumExpectedCounts = {
  institution: 4,
  user: 4,
  case: 2,
  protectedPerson: 2,
  aggressorReference: 2,
  caseEvent: 4,
  caseAssignment: 3,
  auditLog: 4,
}

const expectedInstitutionCodes = [
  'SIPREV-CENTRAL-DEMO',
  'COMISARIA-DEMO-NORTE',
  'FISCALIA-DEMO-CONTROL',
  'AUDITORIA-DEMO',
]

const expectedUserEmails = [
  'admin.demo@siprev.local',
  'comisaria.demo@siprev.local',
  'fiscalia.demo@siprev.local',
  'auditor.demo@siprev.local',
]

const expectedCaseCodes = ['SIPREV-DEMO-CASE-001', 'SIPREV-DEMO-CASE-002']

function assertContainsAll(label, actualValues, expectedValues) {
  const actualSet = new Set(actualValues)
  const missingValues = expectedValues.filter((value) => !actualSet.has(value))

  if (missingValues.length > 0) {
    throw new Error(`Seed verification failed for ${label}: missing ${missingValues.join(', ')}`)
  }
}

async function main() {
  const counts = {
    institution: await prisma.institution.count(),
    user: await prisma.user.count(),
    case: await prisma.case.count(),
    protectedPerson: await prisma.protectedPerson.count(),
    aggressorReference: await prisma.aggressorReference.count(),
    caseEvent: await prisma.caseEvent.count(),
    caseAssignment: await prisma.caseAssignment.count(),
    auditLog: await prisma.auditLog.count(),
  }

  for (const [modelName, minimumCount] of Object.entries(minimumExpectedCounts)) {
    if (counts[modelName] < minimumCount) {
      throw new Error(`Seed verification failed for ${modelName}: expected at least ${minimumCount}, got ${counts[modelName]}`)
    }
  }

  const [institutions, users, cases] = await Promise.all([
    prisma.institution.findMany({
      where: { code: { in: expectedInstitutionCodes } },
      select: { code: true },
    }),
    prisma.user.findMany({
      where: { email: { in: expectedUserEmails } },
      select: { email: true },
    }),
    prisma.case.findMany({
      where: { publicCode: { in: expectedCaseCodes } },
      select: {
        publicCode: true,
        nonSensitiveSummary: true,
        protectedPerson: { select: { id: true } },
        events: { select: { id: true } },
        assignments: { select: { id: true } },
        auditLogs: { select: { id: true } },
      },
    }),
  ])

  assertContainsAll(
    'expected demo institutions',
    institutions.map((institution) => institution.code),
    expectedInstitutionCodes,
  )
  assertContainsAll(
    'expected demo users',
    users.map((user) => user.email),
    expectedUserEmails,
  )
  assertContainsAll(
    'expected demo cases',
    cases.map((caseRecord) => caseRecord.publicCode),
    expectedCaseCodes,
  )

  for (const caseRecord of cases) {
    if (!caseRecord.nonSensitiveSummary || caseRecord.nonSensitiveSummary.trim().length === 0) {
      throw new Error(`Seed verification failed for ${caseRecord.publicCode}: missing non-sensitive summary`)
    }

    if (!caseRecord.protectedPerson || caseRecord.events.length === 0 || caseRecord.assignments.length === 0 || caseRecord.auditLogs.length === 0) {
      throw new Error(
        `Seed verification failed for ${caseRecord.publicCode}: expected protected person, events, assignments, and audit logs`,
      )
    }
  }

  console.info('SIPREV Phase 2 seed verification passed:', counts)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
