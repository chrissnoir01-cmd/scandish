import "server-only";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

export interface ContractData {
  title: string;
  contractNumber: string;
  date: string;
  /** Template body with placeholders already filled in. */
  body: string;
  company: { name: string; url: string; email: string; phone: string };
  business: { name: string; type: string; manager: string; email: string; phone: string; location: string };
  fees: { plan: string; setupFee: string; sixMonths: string; year: string };
  signatory: { name: string; title: string };
  signature: Uint8Array | null;
  stamp: Uint8Array | null;
}

const A4 = { w: 595.28, h: 841.89 };
const M = { x: 56, top: 64, bottom: 70 };
const WIDTH = A4.w - M.x * 2;
const BRAND = rgb(0.85, 0.41, 0.29); // #d9694a
const INK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.42, 0.42, 0.46);
const LINE = rgb(0.86, 0.82, 0.8);

/** Standard PDF fonts use WinAnsi: map typographic characters and drop anything it can't encode. */
function clean(text: string): string {
  return text
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”‟]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/[•·]/g, "-")
    .replace(/ /g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA1-\xFF]/g, "");
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const para of clean(text).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) {
        line = next;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function buildContractPdf(d: ContractData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(clean(`${d.title} - ${d.business.name}`));
  pdf.setAuthor(clean(d.company.name));
  pdf.setSubject(clean(`Contract ${d.contractNumber}`));
  pdf.setCreator("ScanDish");

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const embed = async (bytes: Uint8Array | null): Promise<PDFImage | null> => {
    if (!bytes) return null;
    try {
      return await pdf.embedPng(bytes);
    } catch {
      try {
        return await pdf.embedJpg(bytes);
      } catch {
        return null;
      }
    }
  };
  const [signature, stamp] = await Promise.all([embed(d.signature), embed(d.stamp)]);

  let page: PDFPage = pdf.addPage([A4.w, A4.h]);
  let y = A4.h - M.top;

  const newPage = () => {
    page = pdf.addPage([A4.w, A4.h]);
    y = A4.h - M.top;
  };
  const ensure = (h: number) => {
    if (y - h < M.bottom) newPage();
  };
  const text = (s: string, x: number, size: number, font = regular, color = INK) =>
    page.drawText(clean(s), { x, y, size, font, color });

  const paragraph = (s: string, size = 10.5, font = regular, color = INK, gap = 6) => {
    const lh = size * 1.45;
    for (const line of wrap(s, font, size, WIDTH)) {
      ensure(lh);
      text(line, M.x, size, font, color);
      y -= lh;
    }
    y -= gap;
  };

  /* ----- Header ----- */
  text("Scan", M.x, 20, bold, BRAND);
  page.drawText("Dish", { x: M.x + bold.widthOfTextAtSize("Scan", 20), y, size: 20, font: bold, color: MUTED });
  const right = (s: string, size: number, font = regular, color = MUTED) =>
    page.drawText(clean(s), { x: A4.w - M.x - font.widthOfTextAtSize(clean(s), size), y, size, font, color });
  right(`Contract No. ${d.contractNumber}`, 9.5, bold, INK);
  y -= 14;
  text(`a service of ${d.company.name}`, M.x, 9, regular, MUTED);
  right(`Date: ${d.date}`, 9.5);
  y -= 12;
  page.drawLine({ start: { x: M.x, y }, end: { x: A4.w - M.x, y }, thickness: 1.2, color: BRAND });
  y -= 34;

  const title = clean(d.title).toUpperCase();
  page.drawText(title, { x: (A4.w - bold.widthOfTextAtSize(title, 16)) / 2, y, size: 16, font: bold, color: INK });
  y -= 30;

  /* ----- Parties ----- */
  const colW = (WIDTH - 16) / 2;
  const partyLines = (rows: [string, string][]) => rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
  const parties: { heading: string; lines: string[] }[] = [
    {
      heading: "THE PROVIDER",
      lines: [d.company.name, ...partyLines([["Service", "ScanDish"], ["Website", d.company.url], ["Email", d.company.email], ["Phone", d.company.phone]])],
    },
    {
      heading: "THE CLIENT",
      lines: [
        d.business.name,
        ...partyLines([["Type", d.business.type], ["Represented by", d.business.manager], ["Email", d.business.email], ["Phone", d.business.phone], ["Location", d.business.location]]),
      ],
    },
  ];
  const wrapped = parties.map((p) => p.lines.flatMap((l, i) => wrap(l, i === 0 ? bold : regular, 9.5, colW - 20)));
  const boxH = 30 + Math.max(...wrapped.map((w) => w.length)) * 13;
  parties.forEach((p, i) => {
    const x = M.x + i * (colW + 16);
    page.drawRectangle({ x, y: y - boxH, width: colW, height: boxH, borderColor: LINE, borderWidth: 1, color: rgb(1, 0.985, 0.975) });
    page.drawText(p.heading, { x: x + 10, y: y - 16, size: 8, font: bold, color: BRAND });
    wrapped[i].forEach((line, j) =>
      page.drawText(line, { x: x + 10, y: y - 32 - j * 13, size: 9.5, font: j === 0 ? bold : regular, color: INK })
    );
  });
  y -= boxH + 26;

  /* ----- Body ----- */
  for (const block of d.body.replace(/\r\n/g, "\n").split(/\n\s*\n/)) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("## ")) {
      const [heading, ...rest] = trimmed.split("\n");
      ensure(40);
      y -= 4;
      paragraph(heading.slice(3), 11.5, bold, INK, 2);
      if (rest.length) paragraph(rest.join("\n"));
    } else {
      paragraph(trimmed);
    }
  }

  /* ----- Fees summary ----- */
  ensure(110);
  y -= 6;
  paragraph("Fees summary", 11.5, bold, INK, 4);
  const rows: [string, string][] = [
    ["Plan", d.fees.plan],
    ["One-time setup fee", d.fees.setupFee],
    ["Subscription - 6 months", d.fees.sixMonths],
    ["Subscription - 1 year", d.fees.year],
  ];
  for (const [k, v] of rows) {
    page.drawLine({ start: { x: M.x, y: y + 12 }, end: { x: A4.w - M.x, y: y + 12 }, thickness: 0.5, color: LINE });
    text(k, M.x + 4, 10, regular, MUTED);
    page.drawText(clean(v), { x: A4.w - M.x - 4 - bold.widthOfTextAtSize(clean(v), 10), y, size: 10, font: bold, color: INK });
    y -= 20;
  }
  page.drawLine({ start: { x: M.x, y: y + 12 }, end: { x: A4.w - M.x, y: y + 12 }, thickness: 0.5, color: LINE });
  y -= 16;

  /* ----- Signatures ----- */
  const sigH = 190;
  ensure(sigH + 20);
  paragraph("Signatures", 11.5, bold, INK, 2);
  paragraph("Signed by the authorised representatives of both parties.", 9.5, regular, MUTED, 12);

  const top = y;
  const blocks = [
    { heading: `For ${d.company.name}`, name: d.signatory.name, title: d.signatory.title, provider: true },
    { heading: `For ${d.business.name}`, name: d.business.manager, title: "", provider: false },
  ];
  blocks.forEach((b, i) => {
    const x = M.x + i * (colW + 16);
    let yy = top;
    for (const line of wrap(b.heading, bold, 10, colW)) {
      page.drawText(line, { x, y: yy, size: 10, font: bold, color: INK });
      yy -= 14;
    }
    const sigLineY = yy - 64;

    if (b.provider && stamp) {
      const s = stamp.scaleToFit(96, 96);
      page.drawImage(stamp, { x: x + colW - s.width - 4, y: sigLineY - 30, width: s.width, height: s.height, opacity: 0.9 });
    }
    if (b.provider && signature) {
      const s = signature.scaleToFit(150, 54);
      page.drawImage(signature, { x: x + 4, y: sigLineY + 4, width: s.width, height: s.height });
    }

    page.drawLine({ start: { x, y: sigLineY }, end: { x: x + colW - 12, y: sigLineY }, thickness: 0.8, color: INK });
    page.drawText("Signature", { x, y: sigLineY - 12, size: 8, font: regular, color: MUTED });

    const field = (label: string, value: string, fy: number) => {
      page.drawText(`${label}:`, { x, y: fy, size: 9, font: regular, color: MUTED });
      if (value) {
        page.drawText(clean(value), { x: x + 44, y: fy, size: 9.5, font: bold, color: INK });
      } else {
        page.drawLine({ start: { x: x + 44, y: fy - 2 }, end: { x: x + colW - 12, y: fy - 2 }, thickness: 0.5, color: LINE });
      }
    };
    field("Name", b.name, sigLineY - 32);
    field("Title", b.title, sigLineY - 50);
    field("Date", b.provider ? d.date : "", sigLineY - 68);
    if (!b.provider) {
      page.drawText("Business stamp:", { x, y: sigLineY - 90, size: 9, font: regular, color: MUTED });
    }
  });
  y = top - sigH;

  /* ----- Footer on every page ----- */
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    const footer = clean(`${d.title} No. ${d.contractNumber}  -  ${d.company.name}  -  Page ${i + 1} of ${pages.length}`);
    p.drawLine({ start: { x: M.x, y: 48 }, end: { x: A4.w - M.x, y: 48 }, thickness: 0.5, color: LINE });
    p.drawText(footer, { x: (A4.w - regular.widthOfTextAtSize(footer, 8)) / 2, y: 36, size: 8, font: regular, color: MUTED });
  });

  return pdf.save();
}
