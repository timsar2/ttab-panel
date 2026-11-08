export interface CustomCssLine {
  name: string
  value: string
  raw: string
}
export interface CustomCssParseResult {
  valid: CustomCssLine[]
  invalid: string[]
}
export const MAX_CUSTOM_CSS_LENGTH = 16_384
const NAME = /^--[a-zA-Z][a-zA-Z0-9_-]{0,99}$/

function safeValue(value: string): boolean {
  if (
    !value ||
    value.length > 512 ||
    [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) ||
    /[;:{}@\\<>]|\/\*|\*\/|url|expression|%[0-9a-f]{2}|&#/i.test(value)
  )
    return false
  // Only ordinary token syntax and known, non-resource CSS functions are accepted.
  if (!/^[a-zA-Z0-9#.%+*/(),\s_'"-]+$/.test(value)) return false
  const functions = value.matchAll(/([a-zA-Z_-][a-zA-Z0-9_-]*)\s*\(/g)
  for (const match of functions) {
    if (
      ![
        'var',
        'calc',
        'min',
        'max',
        'clamp',
        'rgb',
        'rgba',
        'hsl',
        'hsla',
        'oklab',
        'oklch',
        'lab',
        'lch',
        'color',
        'color-mix',
      ].includes(match[1].toLowerCase())
    )
      return false
  }
  let depth = 0
  for (const char of value) {
    if (char === '(') depth++
    if (char === ')' && --depth < 0) return false
  }
  return depth === 0
}

export function parseCustomCss(css: string): CustomCssParseResult {
  const result: CustomCssParseResult = { valid: [], invalid: [] }
  if (typeof css !== 'string') return result
  if (css.length > MAX_CUSTOM_CSS_LENGTH)
    return { valid: [], invalid: ['CSS exceeds maximum length'] }
  for (const raw of css.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    if ([...raw].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) {
      result.invalid.push(line)
      continue
    }
    const match = /^(--[^:]+):\s*(.*?)\s*;?$/.exec(line)
    if (!match || !NAME.test(match[1]) || !safeValue(match[2])) result.invalid.push(line)
    else result.valid.push({ name: match[1], value: match[2], raw: line })
  }
  return result
}

export function normalizeCustomVars(input: unknown): Readonly<Record<string, string>> {
  const vars: Record<string, string> = {}
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    for (const [name, value] of Object.entries(input).slice(0, 128)) {
      if (NAME.test(name) && typeof value === 'string' && safeValue(value)) vars[name] = value
    }
  }
  return Object.freeze(vars)
}
