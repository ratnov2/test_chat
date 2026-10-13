const MAX_DIGITS = 15

export const phoneDigits = (value: string) => value.replace(/\D/g, '')

export function formatPhone(raw: string) {
  let d = phoneDigits(raw)
  if (!d) return ''
  if (d[0] === '8') d = `7${d.slice(1)}`
  else if (d[0] === '9') d = `7${d}`
  d = d.slice(0, MAX_DIGITS)
  if (d[0] !== '7') return `+${d}`

  const p = d.slice(1, 11)
  let out = '+7'
  if (p.length) out += ` (${p.slice(0, 3)}`
  if (p.length >= 3) out += ')'
  if (p.length > 3) out += ` ${p.slice(3, 6)}`
  if (p.length > 6) out += `-${p.slice(6, 8)}`
  if (p.length > 8) out += `-${p.slice(8, 10)}`
  return out
}

export const isValidPhone = (digits: string) => (digits[0] === '7' ? digits.length === 11 : digits.length >= 8)
