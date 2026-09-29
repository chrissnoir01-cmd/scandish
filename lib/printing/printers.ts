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

import { escposReceipt, htmlReceipt, type PaperWidth } from "./receipt";
import type { Order } from "../orders";

export type PrinterKind = "bluetooth" | "usb" | "serial" | "system";

export interface PrinterConnection {
  kind: PrinterKind;
  name: string;
  print: (order: Order, restaurant: string, width: PaperWidth, reprint?: boolean) => Promise<void>;
  disconnect: () => Promise<void>;
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

  const write = async (data: Uint8Array<ArrayBuffer>) => {
    // Printers switch off or go out of range; reconnect before each receipt when needed.
    if (!device.gatt?.connected || !characteristic) characteristic = await findCharacteristic();
    const ch = characteristic;
    const withResponse = ch.properties.write;
    const size = withResponse ? 180 : 20;
    for (let i = 0; i < data.length; i += size) {
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
    print: (order, restaurant, width, reprint) => write(escposReceipt(order, restaurant, width, reprint)),
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
    print: async (order, restaurant, width, reprint) => {
      await device.transferOut(endpoint, escposReceipt(order, restaurant, width, reprint));
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
    print: async (order, restaurant, width, reprint) => {
      if (!port.writable) throw new Error("The printer is not connected.");
      const writer = port.writable.getWriter();
      try {
        await writer.write(escposReceipt(order, restaurant, width, reprint));
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
function printHtml(html: string): Promise<void> {
  return new Promise((resolve) => {
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
    frame.onload = () => {
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

const systemConnection: PrinterConnection = {
  kind: "system",
  name: "Printer installed on this computer",
  print: (order, restaurant, width, reprint) => printHtml(htmlReceipt(order, restaurant, width, reprint)),
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
    const connection = await bluetoothConnection(device);
    return { connection, saved: { kind, name: connection.name, ref: device.id } };
  }
  if (kind === "usb") {
    if (!a.usb) throw new Error(UNSUPPORTED);
    const device = await a.usb.requestDevice({ filters: [] });
    const connection = await usbConnection(device);
    return { connection, saved: { kind, name: connection.name, ref: `${device.vendorId}:${device.productId}` } };
  }
  if (!a.serial) throw new Error(UNSUPPORTED);
  const port = await a.serial.requestPort();
  const connection = await serialConnection(port, "Printer on COM port");
  return { connection, saved: { kind, name: connection.name, ref: serialRef(port) } };
}

/** Reconnects to the printer chosen before, without asking (browser permission is remembered). null if not possible. */
export async function reconnectPrinter(saved: SavedPrinter): Promise<PrinterConnection | null> {
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
