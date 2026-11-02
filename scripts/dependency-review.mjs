// Reproduce the complete package-level disposition from committed audit evidence.
import { readFile, writeFile } from 'node:fs/promises'
const before = JSON.parse(
  await readFile(
    new URL('../docs/validation/website-dependency-audit.json', import.meta.url),
    'utf8'
  )
)
const after = JSON.parse(
  await readFile(
    new URL('../docs/validation/website-dependency-audit-after.json', import.meta.url),
    'utf8'
  )
)
const rows = Object.entries(before.vulnerabilities)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, v]) => {
    const roots = v.via.map((x) => (typeof x === 'string' ? x : `[${x.name}](${x.url})`)).join(', ')
    const current = after.vulnerabilities[name]
    return `| ${name} | ${v.severity} | ${current ? current.severity + ' remains (see root-cause disposition)' : 'No longer flagged'} | ${roots} |`
  })
const remaining = Object.entries(after.vulnerabilities).map(
  ([name, v]) =>
    `| ${name} | ${v.severity} | ${v.via.map((x) => (typeof x === 'string' ? x : `[${x.name}](${x.url})`)).join(', ')} |`
)
await writeFile(
  new URL('../docs/dependency-package-inventory.md', import.meta.url),
  `# Package-level dependency review\n\nGenerated from the two retained npm audit reports. Counts include inherited package findings, not distinct exploitable CVEs. Read [review and exploit conditions](dependency-security-review.md) before interpreting these tables.\n\n## All ${rows.length} original package findings\n\n| Package | Before | After | Root advisory or inherited dependency |\n| --- | --- | --- | --- |\n${rows.join('\n')}\n\n## All current findings\n\n| Package | Severity | Root advisory or inherited dependency |\n| --- | --- | --- |\n${remaining.join('\n')}\n`
)
