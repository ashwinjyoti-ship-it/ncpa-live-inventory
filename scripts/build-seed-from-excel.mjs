#!/usr/bin/env node
/**
 * Build database/seed.sql from an NCPA inventory Excel workbook.
 * Default source: sibling inventory-tracker workbook if present, else fixtures/.
 *
 * Expected columns: EQUIPMENT NAME, CATEGORY, JBT, TATA, TET, LT, GDT, OFFICE
 */
import XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'

const candidates = [
  process.argv[2],
  path.resolve('/tmp/inventory-tracker/NCPA_Inventory_All.xlsx'),
  path.resolve('fixtures/NCPA_Inventory_All.xlsx'),
  path.resolve('NCPA_Inventory_All.xlsx'),
].filter(Boolean)

const excelPath = candidates.find((p) => fs.existsSync(p))
if (!excelPath) {
  console.error('Excel file not found. Pass a path: npm run seed:from-excel -- ./file.xlsx')
  process.exit(1)
}

const wb = XLSX.readFile(excelPath)
const sheet = wb.Sheets[wb.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
const venues = ['JBT', 'TATA', 'TET', 'LT', 'GDT', 'OFFICE']

let category = ''
const items = []
for (const r of rows) {
  const sn = String(r['SR.NO.'] ?? '').trim()
  const name = String(r['EQUIPMENT NAME'] ?? '').trim()
  const cat = String(r['CATEGORY'] ?? '').trim()
  if (!name && sn && !/^\d+$/.test(sn)) {
    category = sn
    continue
  }
  if (!name) continue
  if (cat) category = cat
  const qty = {}
  for (const v of venues) qty[v] = Number(r[v]) || 0
  items.push({
    name: name.toUpperCase(),
    category: (category || 'UNCATEGORIZED').toUpperCase(),
    qty,
  })
}

const esc = (s) => String(s).replace(/'/g, "''")
const lines = []
lines.push('-- Auto-generated seed from ' + path.basename(excelPath))
lines.push('DELETE FROM stocktake_lines;')
lines.push('DELETE FROM stocktakes;')
lines.push('DELETE FROM venue_stock;')
lines.push('DELETE FROM items;')
lines.push('DELETE FROM categories;')
lines.push('DELETE FROM venues;')
lines.push('')

venues.forEach((v, i) => {
  lines.push(`INSERT INTO venues (id, name, sort_order) VALUES (${i + 1}, '${esc(v)}', ${i});`)
})
lines.push('')

const cats = [...new Set(items.map((i) => i.category))]
cats.forEach((c, i) => {
  lines.push(`INSERT INTO categories (id, name, sort_order) VALUES (${i + 1}, '${esc(c)}', ${i});`)
})
lines.push('')

const catId = Object.fromEntries(cats.map((c, i) => [c, i + 1]))
items.forEach((item, i) => {
  const id = i + 1
  lines.push(
    `INSERT INTO items (id, name, category_id) VALUES (${id}, '${esc(item.name)}', ${catId[item.category]});`
  )
})
lines.push('')

items.forEach((item, i) => {
  const itemId = i + 1
  venues.forEach((v, vi) => {
    const qty = item.qty[v] || 0
    if (qty > 0) {
      lines.push(
        `INSERT INTO venue_stock (venue_id, item_id, expected_qty) VALUES (${vi + 1}, ${itemId}, ${qty});`
      )
    }
  })
})

fs.mkdirSync('database', { recursive: true })
fs.writeFileSync('database/seed.sql', lines.join('\n') + '\n')
console.log(`Wrote database/seed.sql from ${excelPath}`)
console.log(`Venues ${venues.length} · categories ${cats.length} · items ${items.length}`)
