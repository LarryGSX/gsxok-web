// Limited publication guard, alongside human review. Never prints matched data.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
const base = process.argv[2]
if (!['origin/main', 'origin/Vercel'].includes(base)) throw Error('Select a known review base.')
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
const files = [
  ...new Set(
    [
      ...git('diff', '--name-only', base + '...HEAD').split('\n'),
      ...git('diff', '--name-only').split('\n'),
      ...git('diff', '--cached', '--name-only').split('\n'),
      ...git('ls-files', '--others', '--exclude-standard').split('\n'),
    ].filter(Boolean)
  ),
]
const disallowedArtifacts = files.filter(
  (f) =>
    /\.(pdf|docx|xlsx|sqlite|pfx|pem|key|zip|7z)$/i.test(f) ||
    /(^|\/)\.env($|\.(?!example$))/.test(f) ||
    /(^|\/)\.local\//.test(f)
)
const secretPatternHits = []
for (const file of files) {
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    continue
  }
  if (
    /AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{25,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|sk_live_[A-Za-z0-9]{16,}/.test(
      text
    )
  )
    secretPatternHits.push(file)
  const urls = text.match(/postgres(?:ql)?:\/\/[^\s'"`]+/g) || []
  if (urls.some((u) => u.includes('@') && !/\.invalid|PLACEHOLDER|127\.0\.0\.1/.test(u)))
    secretPatternHits.push(file)
}
const report = {
  base,
  branch: git('branch', '--show-current'),
  filesReviewed: files.length,
  disallowedArtifacts,
  secretPatternHits: [...new Set(secretPatternHits)],
  limitation:
    'Pattern scan only; fictional fixtures and changed source/docs also require human review. No matched data is printed.',
}
writeFileSync(
  'docs/validation/review-publication-scan.json',
  JSON.stringify(report, null, 2) + '\n'
)
console.log(JSON.stringify(report))
if (disallowedArtifacts.length || secretPatternHits.length) process.exitCode = 1
