const DEFAULT_LOGIN_REDIRECT = '/dashboard'

export function safeRedirectPath(value: FormDataEntryValue | string | null | undefined): string {
  if (typeof value !== 'string') {
    return DEFAULT_LOGIN_REDIRECT
  }

  if (!value.startsWith('/') || value.startsWith('//')) {
    return DEFAULT_LOGIN_REDIRECT
  }

  return value
}
