/**
 * Order receipts for thermal printers: one layout, two outputs —
 * ESC/POS bytes for printers connected directly (USB, Bluetooth, serial) and
 * HTML for printers installed on the computer (Wi-Fi, network, any driver).
 */

import { formatAmount, type Order } from "../orders";

export type PaperWidth = 58 | 80;
/** Receipt: full order with prices. Kitchen ticket: what to cook, big and without prices. */
export type TicketKind = "receipt" | "kitchen";

/** Characters per line in the printer's standard font. */
const COLUMNS: Record<PaperWidth, number> = { 58: 32, 80: 48 };

type Line =
  | { kind: "text"; text: string; align?: "left" | "center"; bold?: boolean; big?: boolean }
  | { kind: "rule" }
  | { kind: "pair"; left: string; right: string; bold?: boolean };

export function orderTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Kigali",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
}

function kitchenLayout(order: Order, reprint: boolean): Line[] {
  const lines: Line[] = [
    { kind: "text", text: `KITCHEN #${order.number}`, align: "center", bold: true, big: true },
    { kind: "text", text: orderTime(order.createdAt), align: "center" },
  ];
  if (reprint) lines.push({ kind: "text", text: "(reprint)", align: "center" });
  lines.push({ kind: "rule" });
  if (order.table) lines.push({ kind: "text", text: `TABLE ${order.table}`, bold: true, big: true });
  if (order.phone && !order.table) lines.push({ kind: "text", text: `PHONE ${order.phone}`, bold: true });
  lines.push({ kind: "rule" });
  for (const l of order.items) lines.push({ kind: "text", text: `${l.qty} x ${l.name}`, bold: true, big: true });
  if (order.note) {
    lines.push({ kind: "rule" });
    lines.push({ kind: "text", text: `NOTE: ${order.note}`, bold: true, big: true });
  }
  lines.push({ kind: "rule" });
  return lines;
}

function layout(order: Order, restaurant: string, reprint: boolean, ticket: TicketKind = "receipt"): Line[] {
  if (ticket === "kitchen") return kitchenLayout(order, reprint);
  const lines: Line[] = [
    { kind: "text", text: restaurant, align: "center", bold: true, big: true },
    { kind: "text", text: `ORDER #${order.number}`, align: "center", bold: true, big: true },
    { kind: "text", text: orderTime(order.createdAt), align: "center" },
  ];
  if (reprint) lines.push({ kind: "text", text: "(reprint)", align: "center" });
  lines.push({ kind: "rule" });
  if (order.table) lines.push({ kind: "text", text: `TABLE: ${order.table}`, bold: true, big: true });
  if (order.phone) lines.push({ kind: "text", text: `PHONE: ${order.phone}`, bold: true });
  lines.push({ kind: "rule" });
  for (const l of order.items) {
    lines.push({ kind: "pair", left: `${l.qty} x ${l.name}`, right: l.lineTotal === null ? l.priceText || "-" : formatAmount(l.lineTotal), bold: true });
  }
  lines.push({ kind: "rule" });
  lines.push({ kind: "pair", left: "TOTAL", right: `${formatAmount(order.total)} ${order.currency}`, bold: true });
  if (order.hasUnpriced) lines.push({ kind: "text", text: "+ items priced at the counter" });
  if (order.note) {
    lines.push({ kind: "rule" });
    lines.push({ kind: "text", text: `NOTE: ${order.note}`, bold: true });
  }
  lines.push({ kind: "rule" });
  lines.push({ kind: "text", text: "Ordered from the menu - ScanDish", align: "center" });
  return lines;
}

/* ---------- ESC/POS ---------- */

/** Thermal printers print plain ASCII reliably; accents are dropped ("Café" → "Cafe"). */
function ascii(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7e]/g, "");
}

function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (word.length > width) {
      if (line) out.push(line);
      for (let i = 0; i < word.length; i += width) out.push(word.slice(i, i + width));
      line = out.pop() ?? "";
      continue;
    }
    if (!line) line = word;
    else if (line.length + 1 + word.length <= width) line += ` ${word}`;
    else {
      out.push(line);
      line = word;
    }
  }
  if (line) out.push(line);
  return out.length ? out : [""];
}

const ESC = 0x1b;
const GS = 0x1d;

export function escposReceipt(order: Order, restaurant: string, width: PaperWidth, reprint = false, ticket: TicketKind = "receipt"): Uint8Array<ArrayBuffer> {
  const cols = COLUMNS[width];
  const bytes: number[] = [];
  const push = (...b: number[]) => bytes.push(...b);
  const text = (t: string) => {
    for (const ch of ascii(t)) bytes.push(ch.charCodeAt(0));
  };
  const lf = () => push(0x0a);

  push(ESC, 0x40); // reset
  for (const line of layout(order, restaurant, reprint, ticket)) {
    if (line.kind === "rule") {
      push(ESC, 0x61, 0);
      text("-".repeat(cols));
      lf();
      continue;
    }
    if (line.kind === "pair") {
      push(ESC, 0x61, 0, ESC, 0x45, line.bold ? 1 : 0);
      const right = ascii(line.right);
      const room = Math.max(8, cols - right.length - 1);
      const left = wrap(ascii(line.left), room);
      left.forEach((l, i) => {
        text(i === 0 ? l.padEnd(cols - right.length) + right : `  ${l}`);
        lf();
      });
      push(ESC, 0x45, 0);
      continue;
    }
    push(ESC, 0x61, line.align === "center" ? 1 : 0, ESC, 0x45, line.bold ? 1 : 0, GS, 0x21, line.big ? 0x11 : 0x00);
    for (const l of wrap(ascii(line.text), line.big ? Math.floor(cols / 2) : cols)) {
      text(l);
      lf();
    }
    push(GS, 0x21, 0x00, ESC, 0x45, 0);
  }
  push(ESC, 0x64, 4); // feed so the tear line clears the text
  push(GS, 0x56, 0x42, 0x00); // cut (ignored by printers without a cutter)
  return new Uint8Array(bytes);
}

/* ---------- HTML (printers installed on the computer) ---------- */

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function htmlReceipt(order: Order, restaurant: string, width: PaperWidth, reprint = false, ticket: TicketKind = "receipt"): string {
  const printable = width === 80 ? 72 : 48; // mm the print head covers
  const rows = layout(order, restaurant, reprint, ticket)
    .map((l) => {
      if (l.kind === "rule") return `<hr>`;
      if (l.kind === "pair") return `<div class="pair${l.bold ? " b" : ""}"><span>${esc(l.left)}</span><span>${esc(l.right)}</span></div>`;
      return `<div class="${[l.align === "center" ? "c" : "", l.bold ? "b" : "", l.big ? "big" : ""].join(" ")}">${esc(l.text)}</div>`;
    })
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Order ${order.number}</title><style>
@page{size:${width}mm auto;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff;color:#000}
body{width:${printable}mm;margin:0 auto;padding:2mm 0 6mm;font:12px/1.35 "Courier New",ui-monospace,monospace}
.c{text-align:center}.b{font-weight:700}.big{font-size:17px;line-height:1.25}
hr{border:0;border-top:1px dashed #000;margin:4px 0}
.pair{display:flex;justify-content:space-between;gap:8px}.pair span:last-child{white-space:nowrap}
</style></head><body>${rows}</body></html>`;
}
