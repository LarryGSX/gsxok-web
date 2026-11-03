/* eslint-disable @typescript-eslint/no-require-imports -- standalone Node script (CommonJS) */
// Minimal reader for phpMyAdmin / mysqldump .sql exports: returns the rows of
// one table's INSERT statements as arrays of strings (quotes and escapes handled).
const fs = require('fs')

function parseRows(s) {
  const rows = []
  let i = 0
  while (i < s.length) {
    if (s[i] !== '(') { i++; continue }
    i++
    const row = []
    let cur = ''
    let inStr = false
    while (i < s.length) {
      const c = s[i]
      if (inStr) {
        if (c === '\\') { cur += s[i + 1]; i += 2; continue }
        if (c === "'") {
          if (s[i + 1] === "'") { cur += "'"; i += 2; continue }
          inStr = false; i++; continue
        }
        cur += c; i++; continue
      }
      if (c === "'") { inStr = true; i++; continue }
      if (c === ',') { row.push(cur.trim()); cur = ''; i++; continue }
      if (c === ')') { row.push(cur.trim()); i++; break }
      cur += c; i++
    }
    rows.push(row)
  }
  return rows
}

function readTable(file, table) {
  const dump = fs.readFileSync(file, 'utf8')
  let rows = []
  let from = 0
  for (;;) {
    const start = dump.indexOf('INSERT INTO `' + table + '`', from)
    if (start < 0) break
    const end = dump.indexOf(';\n', start)
    rows = rows.concat(parseRows(dump.slice(dump.indexOf('VALUES', start) + 6, end)))
    from = end
  }
  return rows
}

// Postgres string literal: only the single quote needs doubling (a backslash is
// an ordinary character, unlike in MySQL).
const sqlQuote = (v) => "'" + String(v).trim().replace(/'/g, "''") + "'"

module.exports = { readTable, sqlQuote }
