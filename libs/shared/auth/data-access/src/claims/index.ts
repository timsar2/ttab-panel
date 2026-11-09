export interface AuthUser {
  id: string
  businessEntityId: number | null
  companyId: number | null
  firstName: string
  lastName: string
  roles: readonly string[]
}

const identity = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/'
const role = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'

/** Claims are decoded for UX only; authorization and signature verification belong to the server. */
export function decodeUser(token: string): {
  user: AuthUser
  expiresAt: number
} {
  try {
    const parts = token.split('.')
    if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) throw new Error()
    const decode = (part: string) =>
      JSON.parse(
        new TextDecoder().decode(
          Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/')), char =>
            char.charCodeAt(0),
          ),
        ),
      )
    const header = decode(parts[0])
    const claims = decode(parts[1])
    if (
      header?.alg !== 'HS256' ||
      !claims ||
      typeof claims !== 'object' ||
      typeof claims[`${identity}nameidentifier`] !== 'string' ||
      !claims[`${identity}nameidentifier`].trim() ||
      typeof claims.exp !== 'number' ||
      !Number.isFinite(claims.exp) ||
      claims.exp * 1000 <= Date.now()
    )
      throw new Error()
    const id = (value: unknown): number | null => {
      if (typeof value !== 'string' || !/^\d+$/.test(value)) return null
      const number = Number(value)
      return Number.isSafeInteger(number) && number > 0 ? number : null
    }
    const roles =
      typeof claims[role] === 'string'
        ? [claims[role]]
        : Array.isArray(claims[role])
          ? claims[role]
          : []
    return {
      expiresAt: claims.exp * 1000,
      user: Object.freeze({
        id: claims[`${identity}nameidentifier`],
        businessEntityId: id(claims.sid),
        companyId: id(claims.companyId),
        firstName: typeof claims[`${identity}name`] === 'string' ? claims[`${identity}name`] : '',
        lastName:
          typeof claims[`${identity}surname`] === 'string' ? claims[`${identity}surname`] : '',
        roles: Object.freeze([
          ...new Set<string>(
            roles
              .filter(
                (value: unknown): value is string => typeof value === 'string' && !!value.trim(),
              )
              .map((value: string) => value.trim()),
          ),
        ]),
      }),
    }
  } catch {
    throw new Error('The authentication server returned an invalid or expired access token.')
  }
}
