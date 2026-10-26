// Catches common typing mistakes that still look like a valid email, for example "name@gmail.con".
// Pure function, no dependencies, so it is easy to unit test. Returns a message, or null when the email looks fine.

// Top level domains that are almost always a mistyped "com" (".cm" is a real country domain, so it is not listed).
const TYPO_TLDS = new Set(['con', 'cmo', 'ocm', 'vom', 'xom', 'cim', 'coom', 'comm', 'cpm', 'clm', 'c0m', 'copm', 'cok'])

// Well known domains that are often misspelled.
const TYPO_DOMAINS = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com',
  'gmail.om': 'gmail.com', 'gmail.comm': 'gmail.com',
  'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yahoo.con': 'yahoo.com',
  'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.con': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outllook.com': 'outlook.com', 'outlook.con': 'outlook.com',
}

export function emailProblem(raw) {
  const email = String(raw || '').trim().toLowerCase()
  const at = email.lastIndexOf('@')
  if (at < 1) return null // not an email shape, the normal format check reports that
  const domain = email.slice(at + 1)
  const tld = domain.slice(domain.lastIndexOf('.') + 1)

  if (TYPO_DOMAINS[domain]) return `Check the email domain. Did you mean ${email.slice(0, at)}@${TYPO_DOMAINS[domain]}?`
  // gmail only exists as gmail.com
  if (domain.startsWith('gmail.') && domain !== 'gmail.com') return `Check the email domain. Did you mean ${email.slice(0, at)}@gmail.com?`
  if (TYPO_TLDS.has(tld)) return `Check the email ending ".${tld}". Did you mean ".com"?`
  return null
}
