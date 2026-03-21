export function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) {
    return {}
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((accumulator, item) => {
    const [rawKey, ...rawValue] = item.trim().split('=')

    if (!rawKey) {
      return accumulator
    }

    accumulator[rawKey] = decodeURIComponent(rawValue.join('='))
    return accumulator
  }, {})
}
