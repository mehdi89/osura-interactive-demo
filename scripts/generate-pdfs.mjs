// Writes the synthetic document pack to public/documents/*.pdf from src/document-library.mjs.
// Run: node scripts/generate-pdfs.mjs (rerun after changing the library text).
import { mkdirSync, writeFileSync } from "node:fs";
import { DOCUMENT_LIBRARY } from "../src/document-library.mjs";

const out = new URL("../public/documents/", import.meta.url);
mkdirSync(out, { recursive: true });
const esc = s => s.replace(/[\\()]/g, m => `\\${m}`).replace(/[^\x20-\x7e]/g, "-");
const wrap = (text, width = 88) => text.split(" ").reduce((lines, word) => {
  const last = lines.at(-1);
  if ((last + " " + word).trim().length > width) lines.push(word); else lines[lines.length - 1] = `${last} ${word}`.trim();
  return lines;
}, [""]);

function pdf(doc) {
  const objects = [];
  const add = body => objects.push(body) && objects.length;
  const catalog = add(""), pagesId = add(""), font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const bold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const kids = doc.pages.map((text, index) => {
    const lines = [
      `BT /F2 15 Tf 56 780 Td (${esc(`${doc.name} - ${doc.version}`)}) Tj ET`,
      `BT /F1 9 Tf 56 762 Td (${esc(`SYNTHETIC DEMO DOCUMENT - ${doc.sourceType} - ${doc.status} - dated ${doc.date} - page ${index + 1} of ${doc.pages.length}`)}) Tj ET`,
      ...wrap(text).map((line, i) => `BT /F1 11 Tf 56 ${728 - i * 16} Td (${esc(line)}) Tj ET`),
    ].join("\n");
    const content = add(`<< /Length ${lines.length} >>\nstream\n${lines}\nendstream`);
    return add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R /F2 ${bold} 0 R >> >> /Contents ${content} 0 R >>`);
  });
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map(id => `${id} 0 R`).join(" ")}] /Count ${kids.length} >>`;
  let body = "%PDF-1.4\n";
  const offsets = objects.map((object, i) => { const at = body.length; body += `${i + 1} 0 obj\n${object}\nendobj\n`; return at; });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(o => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  return body + `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
}

for (const doc of DOCUMENT_LIBRARY) writeFileSync(new URL(doc.file, out), pdf(doc), "latin1");
console.log(`Wrote ${DOCUMENT_LIBRARY.length} synthetic PDFs to public/documents/`);
