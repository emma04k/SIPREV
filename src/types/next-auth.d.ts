import type { DefaultSession } from 'next-auth'
import type { JWT as DefaultJWT } from 'next-auth/jwt'

import type { AccountStatus, AuthRole, InstitutionStatus } from '@/lib/auth/credentials'

declare module 'next-auth' {
  interface User {
    displayName: string
    role: AuthRole
    status: AccountStatus
    institutionId: string
    institutionCode: string
    institutionStatus: InstitutionStatus
  }

  interface Session {
    user: DefaultSession['user'] & {
      id: string
      email: string
      displayName: string
      role: AuthRole
      status: AccountStatus
      institutionId: string
      institutionCode: string
      institutionStatus: InstitutionStatus
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    userId: string
    displayName: string
    role: AuthRole
    status: AccountStatus
    institutionId: string
    institutionCode: string
    institutionStatus: InstitutionStatus
  }
}
