import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { AuthenticationRequiredError, requireUser } from '@/lib/auth/current-user'
import {
  CaseFollowUpAuthorizationError,
  CaseFollowUpNotFoundError,
  createCaseFollowUp,
  type CaseFollowUpPrismaClient,
} from '@/lib/cases/create-follow-up'
import { followUpInputSchema } from '@/lib/cases/follow-up-input'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ publicCode: string }> | { publicCode: string }
}

const unsafeClientOwnedFields = new Set([
  'id',
  'caseId',
  'publicCode',
  'userId',
  'institutionId',
  'createdByUserId',
  'actorUserId',
  'actorInstitutionId',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function findUnsafeClientOwnedFields(value: unknown, prefix = ''): string[] {
  if (!isRecord(value)) {
    return []
  }

  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const path = prefix ? `${prefix}.${key}` : key
    const self = unsafeClientOwnedFields.has(key) ? [path] : []

    if (isRecord(nestedValue)) {
      return [...self, ...findUnsafeClientOwnedFields(nestedValue, path)]
    }

    return self
  })
}

function validationDetails(error: ZodError, body: unknown) {
  const details = error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }))
  const existingFields = new Set(details.map((detail) => detail.field))

  for (const field of findUnsafeClientOwnedFields(body)) {
    if (!existingFields.has(field)) {
      details.push({ field, message: 'Client-owned fields are not accepted.' })
    }
  }

  return details
}

async function resolveParams(params: RouteContext['params']) {
  return await params
}

export async function POST(request: Request, { params }: RouteContext) {
  let actor

  try {
    actor = await requireUser()
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    throw error
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      {
        error: 'Solicitud inválida',
        details: [{ field: 'body', message: 'El cuerpo debe ser JSON válido.' }],
      },
      { status: 400 },
    )
  }

  const parsed = followUpInputSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Solicitud inválida',
        details: validationDetails(parsed.error, body),
      },
      { status: 400 },
    )
  }

  const { publicCode } = await resolveParams(params)

  try {
    const updatedCase = await createCaseFollowUp({
      prisma: prisma as unknown as CaseFollowUpPrismaClient,
      actor,
      publicCode,
      input: parsed.data,
    })

    return NextResponse.json({ case: updatedCase }, { status: 201 })
  } catch (error) {
    if (error instanceof CaseFollowUpAuthorizationError) {
      return NextResponse.json({ error: 'No autorizado para modificar el caso' }, { status: 403 })
    }

    if (error instanceof CaseFollowUpNotFoundError) {
      return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 })
    }

    console.error('Failed to create protected case follow-up', error)

    return NextResponse.json({ error: 'No fue posible registrar el seguimiento' }, { status: 500 })
  }
}
