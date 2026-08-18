import { ZodError } from 'zod'
import { NextResponse } from 'next/server'

import { AuthenticationRequiredError, requireUser } from '@/lib/auth/current-user'
import { createCaseInputSchema } from '@/lib/cases/case-input'
import { CaseCreationAuthorizationError, createCase, userCanCreateCase, type CaseCreationPrismaClient } from '@/lib/cases/create-case'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const unsafeClientOwnedFields = new Set([
  'id',
  'caseId',
  'publicCode',
  'userId',
  'institutionId',
  'createdByUserId',
  'reportingInstitutionId',
  'currentInstitutionId',
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

export async function POST(request: Request) {
  let actor

  try {
    actor = await requireUser()
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    throw error
  }

  if (!userCanCreateCase(actor)) {
    return NextResponse.json({ error: 'No autorizado para registrar casos' }, { status: 403 })
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

  const parsed = createCaseInputSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Solicitud inválida',
        details: validationDetails(parsed.error, body),
      },
      { status: 400 },
    )
  }

  try {
    const caseRecord = await createCase({
      prisma: prisma as unknown as CaseCreationPrismaClient,
      actor,
      input: parsed.data,
    })

    return NextResponse.json({ case: caseRecord }, { status: 201 })
  } catch (error) {
    if (error instanceof CaseCreationAuthorizationError) {
      return NextResponse.json({ error: 'No autorizado para registrar casos' }, { status: 403 })
    }

    console.error('Failed to create protected case', error)

    return NextResponse.json({ error: 'No fue posible registrar el caso' }, { status: 500 })
  }
}
