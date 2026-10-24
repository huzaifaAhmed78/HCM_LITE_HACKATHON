// Tiny dependency-free PDF writer (A4, Helvetica). Enough for payslips.
// items: { text, x, y, size?, bold? } or { line: [x1, y1, x2, y2] } or { rect: [x, y, w, h, gray] }
const esc = (s) => String(s).replace(/[\\()]/g, '\\$&').replace(/[^\x20-\x7E]/g, '?')

export function buildPdf(items) {
  const ops = []
  for (const it of items) {
    if (it.line) {
      const [a, b, c, d] = it.line
      ops.push(`0.6 w ${a} ${b} m ${c} ${d} l S`)
    } else if (it.rect) {
      const [x, y, w, h, g = 0.93] = it.rect
      ops.push(`${g} g ${x} ${y} ${w} ${h} re f 0 g`)
    } else {
      ops.push(`BT /${it.bold ? 'F2' : 'F1'} ${it.size || 10} Tf ${it.x} ${it.y} Td (${esc(it.text)}) Tj ET`)
    }
  }
  const content = ops.join('\n')
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ]
  let out = '%PDF-1.4\n'
  const offsets = []
  objs.forEach((o, i) => {
    offsets.push(Buffer.byteLength(out))
    out += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = Buffer.byteLength(out)
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  out += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(out, 'latin1')
}
