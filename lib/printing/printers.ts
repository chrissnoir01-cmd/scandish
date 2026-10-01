/**
 * Connecting the dashboard to a receipt printer, in the browser.
 *
 * - bluetooth: Bluetooth thermal printers (BLE) — Chrome/Edge on Android, Windows, Mac, ChromeOS.
 * - usb:       USB thermal printers — Chrome/Edge (on Windows only when no Windows driver holds the printer).
 * - serial:    printers that appear as a COM port — Bluetooth printers paired in Windows, USB-serial printers.
 * - system:    any printer installed on the computer (Wi-Fi, network, USB with driver), through the print window.
 *
 * The first three print silently. "system" prints silently when Chrome runs with --kiosk-printing.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
import { escposReceipt, htmlReceipt, paymentQrValue, type PaperWidth, type Raster, type ReceiptFooter, type TicketKind } from "./receipt";
import type { ReceiptPayment } from "../types";
import type { Order } from "../orders";

export type PrinterKind = "bluetooth" | "usb" | "serial" | "system";

/** One thing to print. */
export interface PrintPayload {
  order: Order;
  restaurant: string;
  width: PaperWidth;
  reprint?: boolean;
  ticket?: TicketKind;
  /** The restaurant's web address, printed at the foot of receipts. */
  address?: string;
  /** How to pay: printed as a QR code with the code written below (instead of the ScanDish logo). */
  payment?: ReceiptPayment;
  /** Printers installed on the computer: open the print window separately (after a tap), so the dashboard stays usable. */
  ownWindow?: boolean;
}

export interface PrinterConnection {
  kind: PrinterKind;
  name: string;
  /** Resolves when the printer has the data; stops early (AbortError) when `signal` is aborted. */
  print: (job: PrintPayload, signal?: AbortSignal) => Promise<void>;
  disconnect: () => Promise<void>;
}

const LOGO_URL = "/app/icon-192.png";
const LOGO_DOTS = 160; // about 20 mm wide on a 203-dpi receipt printer

/** Draws an image into black-and-white dots (dark → black, light → paper). */
async function toRaster(src: string, size: number): Promise<Raster | null> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, size, size);
  const px = ctx.getImageData(0, 0, size, size).data;
  const rowBytes = size / 8;
  const data = new Uint8Array(rowBytes * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // The coral logo and the QR modules become black; white stays paper.
      const light = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      if (light < 215) data[y * rowBytes + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  return { width: size, height: size, data };
}

let logoRaster: Promise<Raster | null> | null = null;

/** The ScanDish logo for thermal printers (made once, then reused). */
function receiptLogo(): Promise<Raster | null> {
  logoRaster ??= toRaster(LOGO_URL, LOGO_DOTS).catch(() => null);
  return logoRaster;
}

const QR_DOTS = 256; // about 32 mm, easy for any phone camera
const qrCache = new Map<string, { svg: string; raster: Promise<Raster | null> }>();

/** The payment QR code (opens the phone dialler with the USSD code), as SVG and as printer dots. */
function paymentQr(code: string) {
  let hit = qrCache.get(code);
  if (!hit) {
    const svg = renderToStaticMarkup(createElement(QRCodeSVG, { value: paymentQrValue(code), size: QR_DOTS, level: "M", marginSize: 2 }));
    const raster = toRaster(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, QR_DOTS).catch(() => null);
    hit = { svg, raster };
    qrCache.set(code, hit);
  }
  return hit;
}

async function footerFor(j: PrintPayload, forHtml: boolean): Promise<ReceiptFooter> {
  if (j.ticket === "kitchen") return {};
  const payment = j.payment?.code ? j.payment : undefined;
  if (payment) {
    const qr = paymentQr(payment.code);
    return forHtml ? { address: j.address, payment, paymentQrSvg: qr.svg } : { address: j.address, payment, paymentQr: await qr.raster };
  }
  return forHtml ? { address: j.address, logoUrl: `${window.location.origin}${LOGO_URL}` } : { address: j.address, logo: await receiptLogo() };
}

const bytesFor = async (j: PrintPayload) => escposReceipt(j.order, j.restaurant, j.width, j.reprint, j.ticket, await footerFor(j, false));

/** Gives up on a printer that doesn't answer, instead of waiting forever. */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

const NO_ANSWER = "The printer didn't answer. Check it's switched on and nearby, then try again.";

function checkAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Printing cancelled", "AbortError");
}

/* Minimal typings for the Web Bluetooth / WebUSB / Web Serial APIs (not in TypeScript's DOM library). */
interface BtCharacteristic {
  properties: { write: boolean; writeWithoutResponse: boolean };
  writeValueWithResponse: (data: BufferSource) => Promise<void>;
  writeValueWithoutResponse: (data: BufferSource) => Promise<void>;
}
interface BtService {
  getCharacteristics: () => Promise<BtCharacteristic[]>;
}
interface BtDevice {
  id: string;
  name?: string;
  gatt?: { connected: boolean; connect: () => Promise<{ getPrimaryServices: () => Promise<BtService[]> }>; disconnect: () => void };
}
interface UsbEndpoint {
  endpointNumber: number;
  direction: "in" | "out";
  type: string;
}
interface UsbDevice {
  productName?: string;
  manufacturerName?: string;
  vendorId: number;
  productId: number;
  opened: boolean;
  configuration: { interfaces: { interfaceNumber: number; alternates: { alternateSetting: number; interfaceClass: number; endpoints: UsbEndpoint[] }[] }[] } | null;
  open: () => Promise<void>;
  close: () => Promise<void>;
  selectConfiguration: (n: number) => Promise<void>;
  claimInterface: (n: number) => Promise<void>;
  selectAlternateInterface: (n: number, alt: number) => Promise<void>;
  transferOut: (endpoint: number, data: BufferSource) => Promise<unknown>;
}
interface SerialPortLike {
  getInfo: () => { usbVendorId?: number; usbProductId?: number };
  open: (o: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  writable: WritableStream<Uint8Array> | null;
}
interface BrowserApis {
  bluetooth?: {
    requestDevice: (o: { acceptAllDevices: boolean; optionalServices: string[] }) => Promise<BtDevice>;
    getDevices?: () => Promise<BtDevice[]>;
  };
  usb?: { requestDevice: (o: { filters: object[] }) => Promise<UsbDevice>; getDevices: () => Promise<UsbDevice[]> };
  serial?: { requestPort: () => Promise<SerialPortLike>; getPorts: () => Promise<SerialPortLike[]> };
}

const apis = () => (typeof navigator === "undefined" ? {} : (navigator as unknown as BrowserApis));

export function printerSupport(): Record<PrinterKind, boolean> {
  const a = apis();
  return { bluetooth: Boolean(a.bluetooth), usb: Boolean(a.usb), serial: Boolean(a.serial), system: typeof window !== "undefined" };
}

/** Where a printer was connected before, so the dashboard reconnects on its own after a reload. */
export interface SavedPrinter {
  kind: PrinterKind;
  name: string;
  /** Bluetooth device id, or "vendorId:productId" for USB / serial. */
  ref: string;
}

/* ---------- Bluetooth ---------- */

// Services used by common Bluetooth receipt printers (Xprinter, GOOJPRT, MUNBYN, PeriPage, generic "BlueTooth Printer" …).
const BT_SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "0000fee7-0000-1000-8000-00805f9b34fb",
  "0000ae30-0000-1000-8000-00805f9b34fb",
  "0000ae3a-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
];

async function bluetoothConnection(device: BtDevice): Promise<PrinterConnection> {
  let characteristic: BtCharacteristic | null = null;

  const findCharacteristic = async () => {
    if (!device.gatt) throw new Error("This Bluetooth device can't receive data.");
    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();
    for (const service of services) {
      for (const ch of await service.getCharacteristics()) {
        if (ch.properties.write || ch.properties.writeWithoutResponse) return ch;
      }
    }
    throw new Error("This Bluetooth device isn't a supported receipt printer.");
  };

  characteristic = await findCharacteristic();

  const write = async (data: Uint8Array<ArrayBuffer>, signal?: AbortSignal) => {
    // Printers switch off or go out of range; reconnect before each receipt when needed.
    if (!device.gatt?.connected || !characteristic) characteristic = await findCharacteristic();
    checkAborted(signal);
    const ch = characteristic;
    const withResponse = ch.properties.write;
    const size = withResponse ? 180 : 20;
    for (let i = 0; i < data.length; i += size) {
      checkAborted(signal);
      const chunk = data.slice(i, i + size);
      if (withResponse) await ch.writeValueWithResponse(chunk);
      else {
        await ch.writeValueWithoutResponse(chunk);
        await new Promise((r) => setTimeout(r, 8)); // don't overrun the printer's small buffer
      }
    }
  };

  return {
    kind: "bluetooth",
    name: device.name || "Bluetooth printer",
    print: async (job, signal) => write(await bytesFor(job), signal),
    disconnect: async () => device.gatt?.disconnect(),
  };
}

/* ---------- USB ---------- */

async function usbConnection(device: UsbDevice): Promise<PrinterConnection> {
  try {
    if (!device.opened) await device.open();
    if (!device.configuration) await device.selectConfiguration(1);
  } catch {
    throw new Error("The printer couldn't be opened. Unplug it, plug it back in and try again.");
  }
  const interfaces = device.configuration?.interfaces ?? [];
  // Prefer the printer-class interface (7); otherwise any with a bulk output.
  const candidates = interfaces
    .flatMap((i) => i.alternates.map((alt) => ({ i, alt, out: alt.endpoints.find((e) => e.direction === "out" && e.type === "bulk") })))
    .filter((c) => c.out)
    .sort((a, b) => Number(b.alt.interfaceClass === 7) - Number(a.alt.interfaceClass === 7));
  const pick = candidates[0];
  if (!pick?.out) throw new Error("This USB device isn't a supported receipt printer.");
  try {
    await device.claimInterface(pick.i.interfaceNumber);
    if (pick.alt.alternateSetting !== 0) await device.selectAlternateInterface(pick.i.interfaceNumber, pick.alt.alternateSetting);
  } catch {
    throw new Error(
      "The computer's own printer driver is using this printer. Choose “Printer installed on this computer” instead — it works with any printer."
    );
  }
  const endpoint = pick.out.endpointNumber;
  return {
    kind: "usb",
    name: [device.manufacturerName, device.productName].filter(Boolean).join(" ") || "USB printer",
    print: async (job, signal) => {
      const data = await bytesFor(job);
      // Sent in pieces so a cancel stops between them.
      for (let i = 0; i < data.length; i += 4096) {
        checkAborted(signal);
        await device.transferOut(endpoint, data.slice(i, i + 4096));
      }
    },
    disconnect: () => device.close().catch(() => {}),
  };
}

/* ---------- Serial (COM port) ---------- */

async function serialConnection(port: SerialPortLike, label: string): Promise<PrinterConnection> {
  try {
    await port.open({ baudRate: 9600 });
  } catch (err) {
    // Already open from an earlier connection on this page is fine.
    if (!(err instanceof DOMException && err.name === "InvalidStateError")) {
      throw new Error("The printer port couldn't be opened. Check the printer is on and paired, then try again.");
    }
  }
  return {
    kind: "serial",
    name: label,
    print: async (job, signal) => {
      if (!port.writable) throw new Error("The printer is not connected.");
      const data = await bytesFor(job);
      const writer = port.writable.getWriter();
      try {
        for (let i = 0; i < data.length; i += 512) {
          checkAborted(signal);
          await writer.write(data.slice(i, i + 512));
        }
      } finally {
        writer.releaseLock();
      }
    },
    disconnect: () => port.close().catch(() => {}),
  };
}

const serialRef = (port: SerialPortLike) => {
  const info = port.getInfo();
  return `${info.usbVendorId ?? 0}:${info.usbProductId ?? 0}`;
};

/* ---------- Printer installed on the computer ---------- */

/** Prints through the browser's print window into a hidden frame sized to the receipt paper. */
function printHtml(html: string, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Printing cancelled", "AbortError"));
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setTimeout(() => frame.remove(), 1000);
      resolve();
    };
    // A frame that never loads must not leave the job hanging.
    const giveUp = setTimeout(() => {
      if (done) return;
      done = true;
      frame.remove();
      reject(new Error("The print window didn't open. Try again."));
    }, 15_000);
    signal?.addEventListener("abort", () => {
      if (done) return;
      done = true;
      clearTimeout(giveUp);
      frame.remove();
      reject(new DOMException("Printing cancelled", "AbortError"));
    });
    frame.onload = () => {
      clearTimeout(giveUp);
      if (done) return;
      const w = frame.contentWindow;
      if (!w) return finish();
      w.addEventListener("afterprint", finish);
      w.focus();
      w.print();
      // print() returns once the dialog closes (or at once when printing silently).
      setTimeout(finish, 500);
    };
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
}

/**
 * Opens the receipt in its own small window, which prints itself and closes. The print window then
 * belongs to that window, so the dashboard keeps working. Only possible right after a tap (browsers
 * block pop-ups otherwise); returns false when it couldn't open.
 */
function printInWindow(html: string): boolean {
  // Browsers allow a new window only right after a tap. Without a way to check that, use the page instead.
  const activation = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation;
  if (!activation?.isActive) return false;
  const page = html.replace(
    "</body>",
    `<script>addEventListener("load",function(){setTimeout(function(){print();setTimeout(function(){close()},300)},150)});</script></body>`
  );
  const url = URL.createObjectURL(new Blob([page], { type: "text/html" }));
  const win = window.open(url, "_blank", "noopener,popup,width=420,height=640");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  // "noopener" makes the browser return null even when the window opened (it's allowed right after a tap).
  void win;
  return true;
}

const systemConnection: PrinterConnection = {
  kind: "system",
  name: "Printer installed on this computer",
  print: async (j, signal) => {
    const html = htmlReceipt(j.order, j.restaurant, j.width, j.reprint, j.ticket, await footerFor(j, true));
    if (j.ownWindow && printInWindow(html)) return;
    await printHtml(html, signal);
  },
  disconnect: async () => {},
};

/* ---------- Connect (after a click) and reconnect (on load) ---------- */

/** Opens the browser's device chooser. Must be called from a click. */
export async function connectPrinter(kind: PrinterKind): Promise<{ connection: PrinterConnection; saved: SavedPrinter }> {
  const a = apis();
  if (kind === "system") return { connection: systemConnection, saved: { kind, name: systemConnection.name, ref: "" } };

  if (kind === "bluetooth") {
    if (!a.bluetooth) throw new Error(UNSUPPORTED);
    const device = await a.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: BT_SERVICES });
    const connection = await withTimeout(bluetoothConnection(device), 15_000, NO_ANSWER);
    return { connection, saved: { kind, name: connection.name, ref: device.id } };
  }
  if (kind === "usb") {
    if (!a.usb) throw new Error(UNSUPPORTED);
    const device = await a.usb.requestDevice({ filters: [] });
    const connection = await withTimeout(usbConnection(device), 15_000, NO_ANSWER);
    return { connection, saved: { kind, name: connection.name, ref: `${device.vendorId}:${device.productId}` } };
  }
  if (!a.serial) throw new Error(UNSUPPORTED);
  const port = await a.serial.requestPort();
  const connection = await withTimeout(serialConnection(port, "Printer on COM port"), 15_000, NO_ANSWER);
  return { connection, saved: { kind, name: connection.name, ref: serialRef(port) } };
}

/** Reconnects to the printer chosen before, without asking (browser permission is remembered). null if not possible. */
export async function reconnectPrinter(saved: SavedPrinter): Promise<PrinterConnection | null> {
  // A printer that is off must not keep the dashboard "connecting" forever.
  return withTimeout(reconnectNow(saved), 8_000, NO_ANSWER).catch(() => null);
}

async function reconnectNow(saved: SavedPrinter): Promise<PrinterConnection | null> {
  const a = apis();
  try {
    if (saved.kind === "system") return systemConnection;
    if (saved.kind === "usb" && a.usb) {
      const device = (await a.usb.getDevices()).find((d) => `${d.vendorId}:${d.productId}` === saved.ref);
      return device ? await usbConnection(device) : null;
    }
    if (saved.kind === "serial" && a.serial) {
      const port = (await a.serial.getPorts()).find((p) => serialRef(p) === saved.ref);
      return port ? await serialConnection(port, saved.name) : null;
    }
    if (saved.kind === "bluetooth" && a.bluetooth?.getDevices) {
      const device = (await a.bluetooth.getDevices()).find((d) => d.id === saved.ref);
      return device ? await bluetoothConnection(device) : null;
    }
  } catch {
    // Printer off or out of range: the owner taps "Reconnect".
  }
  return null;
}

const UNSUPPORTED = "This browser can't connect to printers directly. Open the dashboard in Google Chrome or Microsoft Edge.";

/** Friendly message for a failed connect (closing the chooser is not an error). */
export function printerError(err: unknown): string | null {
  if (err instanceof DOMException && (err.name === "NotFoundError" || err.name === "AbortError")) return null; // chooser closed
  if (err instanceof DOMException && err.name === "SecurityError") return "The browser blocked the printer. Allow it and try again.";
  return err instanceof Error ? err.message : "The printer couldn't be connected.";
}
