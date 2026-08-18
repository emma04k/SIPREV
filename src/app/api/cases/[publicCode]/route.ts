import { NextResponse } from 'next/server'

import { recordSensitiveCaseView } from '@/lib/audit-log'
import { canAccessCase } from '@/lib/auth/permissions'
import { requireUser, AuthenticationRequiredError } from '@/lib/auth/current-user'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ publicCode: string }> | { publicCode: string }
}

async function resolveParams(params: RouteContext['params']) {
  return await params
}

export async function GET(_request: Request, { params }: RouteContext) {
  let user

  try {
    user = await requireUser()
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    throw error
  }

  const { publicCode } = await resolveParams(params)
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
    return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 })
  }

  if (!canAccessCase(user, caseRecord)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  try {
    await recordSensitiveCaseView({ prisma, actor: user, caseRecord })
  } catch (error) {
    console.error('Failed to record sensitive case VIEW audit', error)

    return NextResponse.json({ error: 'No fue posible registrar la auditoría de acceso' }, { status: 500 })
  }

  return NextResponse.json({
    case: {
      publicCode: caseRecord.publicCode,
      caseType: caseRecord.caseType,
      violenceTypes: caseRecord.violenceTypes,
      riskLevel: caseRecord.riskLevel,
      status: caseRecord.status,
      nonSensitiveSummary: caseRecord.nonSensitiveSummary,
      protectedPerson: caseRecord.protectedPerson,
      events: caseRecord.events.map((event) => ({
        ...event,
        occurredAt: event.occurredAt.toISOString(),
      })),
    },
  })
}
