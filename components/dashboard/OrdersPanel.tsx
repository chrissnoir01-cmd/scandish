"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Bluetooth,
  Check,
  ChefHat,
  CircleAlert,
  Loader2,
  Monitor,
  Phone,
  Plug,
  Printer,
  RefreshCw,
  StickyNote,
  Unplug,
  Usb,
  Volume2,
  X,
  CookingPot,
  Ban,
  BellRing,
  Wallet,
} from "lucide-react";
import { auth, getIdToken } from "@/lib/firebase";
import { claimPrint, loadOrders, releasePrint, updateOrderStatus, updateOrdersOpen, updateReceiptPayment } from "@/app/actions/orders";
import { QRCodeSVG } from "qrcode.react";
import { paymentQrValue } from "@/lib/printing/receipt";
import type { ReceiptPayment } from "@/lib/types";
import { ORDER_LIMITS, STATUS_LABEL, formatAmount, toOrder, type Order, type OrderStatus } from "@/lib/orders";
import { orderTime, type PaperWidth, type TicketKind } from "@/lib/printing/receipt";
import { JOB_LABEL, PrintQueue, isActive, type PrintJob } from "@/lib/printing/queue";
import {
  connectPrinter,
  printerError,
  printerSupport,
  reconnectPrinter,
  type PrinterConnection,
  type PrinterKind,
  type SavedPrinter,
} from "@/lib/printing/printers";

const BRAND = "#f08c6c";
const SETTINGS_KEY = "scandish.printer";
const STATION_KEY = "scandish.station";
/** New orders younger than this still auto-print when a print station comes online. */
const AUTO_PRINT_WINDOW_MS = 15 * 60_000;

interface PrinterSettings {
  saved: SavedPrinter | null;
  width: PaperWidth;
  auto: boolean;
  /** What prints automatically for each new order. */
  tickets: "receipt" | "kitchen" | "both";
}

const ticketsFor = (t: PrinterSettings["tickets"]): TicketKind[] => (t === "both" ? ["kitchen", "receipt"] : [t]);

function readSettings(): PrinterSettings {
  try {
    const v = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null");
    if (v && typeof v === "object") {
      const tickets = v.tickets === "kitchen" || v.tickets === "both" ? v.tickets : "receipt";
      return { saved: v.saved ?? null, width: v.width === 58 ? 58 : 80, auto: v.auto !== false, tickets };
    }
  } catch {
    // Nothing saved.
  }
  return { saved: null, width: 80, auto: true, tickets: "receipt" };
}

function writeSettings(s: PrinterSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // Not remembered on this device.
  }
}

/** A random name for this device, so the log shows which print station printed an order. */
function stationId(): string {
  try {
    let id = localStorage.getItem(STATION_KEY);
    if (!id) {
      id = `station-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(STATION_KEY, id);
    }
    return id;
  } catch {
    return "station";
  }
}

/* ---------- Sound ---------- */

let audio: AudioContext | null = null;

/** Browsers only allow sound after the page has been clicked; the first click on the dashboard unlocks it. */
function unlockSound() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
  } catch {
    // No sound on this browser.
  }
}

function chime() {
  if (!audio || audio.state !== "running") return;
  const now = audio.currentTime;
  [880, 1175, 1568].forEach((freq, i) => {
    const osc = audio!.createOscillator();
    const gain = audio!.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.0001, now + i * 0.18);
    gain.gain.exponentialRampToValueAtTime(0.35, now + i * 0.18 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.4);
    osc.connect(gain).connect(audio!.destination);
    osc.start(now + i * 0.18);
    osc.stop(now + i * 0.18 + 0.45);
  });
}

const msFromNow = (ms: number) => Date.now() + ms;
/** How long the new-order sound plays unless someone taps "Seen". */
const ALERT_MS = 5_000;

/** YYYY-MM-DD in Kigali, matching the day stored on each order. */
const kigaliDay = (ms: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Kigali", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));

function ago(iso: string, now: number): string {
  const min = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h} h ago` : orderTime(iso);
}

type Filter = "active" | "done" | "all";

/**
 * Track order (Premium): switch ordering on/off, connect the receipt printer, and follow orders live.
 * Stays mounted while the owner uses other dashboard tabs, so orders keep printing.
 */
export default function OrdersPanel({
  restaurantName,
  pageAddress,
  payment,
  onPaymentChange,
  requestUnlock,
  initialOpen,
  visible,
  onNewCount,
  notify: notifyProp,
}: {
  restaurantName: string;
  /** The restaurant's web address, printed at the foot of receipts. */
  pageAddress: string;
  /** Payment details printed on receipts (QR code + USSD code). */
  payment: ReceiptPayment;
  onPaymentChange: (p: ReceiptPayment) => void;
  /** Asks for the Secure Dashboard PIN; resolves true once unlocked. */
  requestUnlock: (reason?: string) => Promise<boolean>;
  initialOpen: boolean;
  visible: boolean;
  onNewCount: (n: number) => void;
  notify: (msg: string, type?: "success" | "error") => void;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [switching, setSwitching] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [live, setLive] = useState<"connecting" | "live" | "polling">("connecting");
  const [filter, setFilter] = useState<Filter>("active");
  const [now, setNow] = useState(() => Date.now());

  const [settings, setSettings] = useState<PrinterSettings>({ saved: null, width: 80, auto: true, tickets: "receipt" });
  const [printer, setPrinter] = useState<PrinterConnection | null>(null);
  const [connecting, setConnecting] = useState<PrinterKind | "reconnect" | null>(null);
  // Print jobs run in the background; the dashboard stays usable while they print.
  const [queue] = useState(() => new PrintQueue());
  const jobs = useSyncExternalStore(queue.subscribe, queue.snapshot, queue.snapshot);
  const [support, setSupport] = useState<Record<PrinterKind, boolean>>({ bluetooth: false, usb: false, serial: false, system: true });
  const [showHelp, setShowHelp] = useState(false);

  // The dashboard's callbacks change on every render; read them through refs so live updates don't restart.
  const notifyRef = useRef(notifyProp);
  const newCountRef = useRef(onNewCount);
  useEffect(() => {
    notifyRef.current = notifyProp;
    newCountRef.current = onNewCount;
  });
  const notify = useCallback((msg: string, type?: "success" | "error") => notifyRef.current(msg, type), []);

  const known = useRef<Set<string> | null>(null);
  /** Orders this device already tried to print automatically — never retried in a loop. */
  const autoTried = useRef(new Set<string>());
  /** Status changes made here, shown until the server confirms them (an older update can't undo them). */
  const pendingStatus = useRef(new Map<string, { status: OrderStatus; until: number }>());
  const station = useRef("station");
  /** Bumped on Cancel: a connection that finishes afterwards is ignored. */
  const connectAttempt = useRef(0);

  /* ----- Printer settings and reconnect ----- */

  useEffect(() => {
    const s = readSettings();
    station.current = stationId();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- printer settings live in this browser only
    setSettings(s);
    setSupport(printerSupport());
    if (s.saved) {
      const attempt = ++connectAttempt.current;
      setConnecting("reconnect");
      reconnectPrinter(s.saved)
        .then((c) => {
          if (attempt === connectAttempt.current) setPrinter(c);
          else void c?.disconnect();
        })
        .finally(() => {
          if (attempt === connectAttempt.current) setConnecting(null);
        });
    }
  }, []);

  const saveSettings = (next: PrinterSettings) => {
    setSettings(next);
    writeSettings(next);
  };

  useEffect(() => {
    const unlock = () => unlockSound();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  /* ----- Orders: first load, then live updates (polling if live is unavailable) ----- */

  /* ----- New-order alert: rings for 5 seconds; "Seen" (or any action on the order) stops it ----- */

  const [alert, setAlert] = useState<{ ids: string[]; text: string } | null>(null);
  const ringing = useRef<{ repeat: ReturnType<typeof setInterval>; stop: ReturnType<typeof setTimeout> } | null>(null);

  const silence = useCallback(() => {
    if (!ringing.current) return;
    clearInterval(ringing.current.repeat);
    clearTimeout(ringing.current.stop);
    ringing.current = null;
  }, []);

  const acknowledge = useCallback(() => {
    silence();
    setAlert(null);
  }, [silence]);

  const ring = useCallback(
    (fresh: Order[]) => {
      silence();
      chime();
      const repeat = setInterval(chime, 1000);
      const stop = setTimeout(silence, ALERT_MS);
      ringing.current = { repeat, stop };
      setAlert((prev) => {
        const ids = [...(prev?.ids ?? []), ...fresh.map((o) => o.id)];
        const text =
          ids.length === 1
            ? `New order #${fresh[0].number}${fresh[0].table ? ` · table ${fresh[0].table}` : ""}`
            : `${ids.length} new orders`;
        return { ids, text };
      });
    },
    [silence]
  );

  useEffect(() => silence, [silence]);

  /** Any action on an order that is ringing counts as "seen". */
  const seen = (orderId: string) => {
    if (alert?.ids.includes(orderId)) acknowledge();
  };

  const receive = useCallback((incoming: Order[]) => {
    const now = Date.now();
    const list = incoming.map((o) => {
      const pending = pendingStatus.current.get(o.id);
      if (!pending) return o;
      if (pending.status === o.status || pending.until < now) {
        pendingStatus.current.delete(o.id);
        return o;
      }
      return { ...o, status: pending.status };
    });
    if (known.current) {
      const fresh = list.filter((o) => !known.current!.has(o.id) && o.status === "new");
      if (fresh.length) ring(fresh);
    }
    known.current = new Set(list.map((o) => o.id));
    setOrders(list);
    setLoaded(true);
  }, [ring]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;

    const fetchOnce = async (prune = false) => {
      const res = await loadOrders(await getIdToken(), prune);
      if (!cancelled && res.ok) receive(res.data);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchOnce().catch(() => {});
    };
    const startPolling = () => {
      if (poll || cancelled) return;
      setLive("polling");
      poll = setInterval(() => void fetchOnce().catch(() => {}), 10_000);
      document.addEventListener("visibilitychange", onVisible);
    };

    (async () => {
      await fetchOnce(true).catch(() => {});
      const uid = auth.currentUser?.uid;
      if (!uid || cancelled) return startPolling();
      try {
        // Loaded only here, so the rest of the dashboard doesn't download the database client.
        const [{ db }, fs] = await Promise.all([import("@/lib/firebase-db"), import("firebase/firestore")]);
        if (cancelled) return;
        const q = fs.query(fs.collection(db, "restaurants", uid, "orders"), fs.orderBy("createdAt", "desc"), fs.limit(100));
        unsubscribe = fs.onSnapshot(
          q,
          (snap) => {
            setLive("live");
            receive(snap.docs.map((d) => toOrder(d.id, d.data())));
          },
          () => {
            // Live updates not permitted or offline: fall back to checking every 15 seconds.
            unsubscribe?.();
            unsubscribe = null;
            startPolling();
          }
        );
      } catch {
        startPolling();
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
      if (poll) clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [receive]);

  const newCount = orders.filter((o) => o.status === "new").length;
  useEffect(() => newCountRef.current(newCount), [newCount]);

  // Keep a tablet's screen awake while it's the print station.
  useEffect(() => {
    if (!open || !printer || !settings.auto) return;
    type Lock = { release: () => Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<Lock> } };
    if (!nav.wakeLock) return;
    let lock: Lock | null = null;
    const acquire = () => {
      if (document.visibilityState === "visible") nav.wakeLock!.request("screen").then((l) => (lock = l)).catch(() => {});
    };
    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      document.removeEventListener("visibilitychange", acquire);
      void lock?.release().catch(() => {});
    };
  }, [open, printer, settings.auto]);

  /* ----- Printing ----- */

  /** Queues one order's tickets on a printer (the computer's own printer when none is connected). */
  const queuePrint = useCallback(
    (
      order: Order,
      tickets: TicketKind[],
      opts: { auto: boolean; reprint: boolean; via: PrinterConnection | null; label?: string; key?: string }
    ): boolean => {
      let claimed = false;
      return queue.add({
        key: opts.key ?? `${order.id}:${opts.auto ? "auto" : tickets.join("+")}`,
        orderId: order.id,
        label: opts.label ?? `Order #${order.number} · ${tickets.map((t) => (t === "kitchen" ? "kitchen ticket" : "receipt")).join(" + ")}`,
        auto: opts.auto,
        // Automatic prints: only the first device to claim a new order prints it.
        before: opts.auto
          ? async () => {
              const res = await claimPrint(await getIdToken(), order.id, station.current);
              claimed = res.ok && res.data;
              return claimed;
            }
          : undefined,
        run: async (signal) => {
          const target = opts.via ?? (await connectPrinter("system")).connection;
          for (const ticket of tickets) {
            await target.print(
              { order, restaurant: restaurantName, width: settings.width, reprint: opts.reprint, ticket, address: pageAddress, payment, ownWindow: !opts.auto },
              signal
            );
          }
        },
        after: async (status) => {
          if (order.id === "test") return;
          const token = await getIdToken().catch(() => "");
          if (!token) return;
          if (opts.auto && claimed && status !== "completed") {
            // Not printed after all: show "Not printed" so staff can press Print.
            await releasePrint(token, order.id);
            if (status === "failed") notify(`Order #${order.number} didn't print — check the printer, then press Receipt.`, "error");
          }
          if (!opts.auto && status === "completed" && tickets.includes("receipt")) await claimPrint(token, order.id, station.current, true);
        },
      });
    },
    [queue, restaurantName, pageAddress, payment, settings.width, notify]
  );

  // Auto-print: every new, unprinted order gets one automatic attempt on this device.
  useEffect(() => {
    if (!printer || !settings.auto || !loaded) return;
    const due = orders
      .filter((o) => o.status === "new" && !o.printedAt && !autoTried.current.has(o.id) && Date.now() - new Date(o.createdAt).getTime() < AUTO_PRINT_WINDOW_MS)
      .reverse(); // oldest first
    for (const order of due) {
      autoTried.current.add(order.id);
      queuePrint(order, ticketsFor(settings.tickets), { auto: true, reprint: false, via: printer });
    }
  }, [orders, printer, settings.auto, settings.tickets, loaded, queuePrint]);

  const manualPrint = (order: Order, ticket: TicketKind) => {
    seen(order.id);
    const ok = queuePrint(order, [ticket], { auto: false, reprint: ticket === "receipt" && Boolean(order.printedAt), via: printer });
    if (!ok) notify(`Order #${order.number} is already printing`);
  };

  const connect = async (kind: PrinterKind) => {
    const attempt = ++connectAttempt.current;
    setConnecting(kind);
    try {
      const { connection, saved } = await connectPrinter(kind);
      if (attempt !== connectAttempt.current) {
        void connection.disconnect();
        return;
      }
      await printer?.disconnect().catch(() => {});
      setPrinter(connection);
      saveSettings({ ...settings, saved });
      notify(`${connection.name} connected`);
    } catch (err) {
      const msg = printerError(err);
      if (msg && attempt === connectAttempt.current) notify(msg, "error");
    } finally {
      if (attempt === connectAttempt.current) setConnecting(null);
    }
  };

  const reconnect = async () => {
    if (!settings.saved) return;
    // Bluetooth needs the chooser, and browsers only allow it straight after the tap.
    if (settings.saved.kind === "bluetooth" || settings.saved.kind === "system") return connect(settings.saved.kind);
    const attempt = ++connectAttempt.current;
    setConnecting("reconnect");
    try {
      const c = await reconnectPrinter(settings.saved);
      if (attempt !== connectAttempt.current) {
        void c?.disconnect();
        return;
      }
      if (c) {
        setPrinter(c);
        notify(`${c.name} connected`);
      } else {
        notify("The printer didn't answer. Check it's on and plugged in, then press Reconnect again.", "error");
      }
    } finally {
      if (attempt === connectAttempt.current) setConnecting(null);
    }
  };

  /** Stops waiting for a printer that doesn't answer. */
  const cancelConnect = () => {
    connectAttempt.current++;
    setConnecting(null);
  };

  /* ----- Payment on receipts ----- */

  const [editingPayment, setEditingPayment] = useState(false);

  const savePayment = async (next: ReceiptPayment, retried = false): Promise<boolean> => {
    try {
      const res = await updateReceiptPayment(await getIdToken(), next);
      if (!res.ok && res.code === "locked" && !retried) {
        return (await requestUnlock("Payment details are protected.")) ? savePayment(next, true) : false;
      }
      if (!res.ok) {
        notify(res.error, "error");
        return false;
      }
      onPaymentChange(res.data);
      notify(res.data.code ? "Payment details saved — they print on every receipt" : "Payment details removed from receipts");
      return true;
    } catch {
      notify("Check your connection and try again.", "error");
      return false;
    }
  };

  const disconnect = async () => {
    await printer?.disconnect().catch(() => {});
    setPrinter(null);
    saveSettings({ ...settings, saved: null });
  };

  const testPrint = () => {
    const sample: Order = {
      id: "test",
      number: 0,
      day: "",
      items: [
        { name: "Test dish", category: "", qty: 2, unitPrice: 3500, priceText: "3,500", lineTotal: 7000 },
        { name: "Juice", category: "", qty: 1, unitPrice: 1500, priceText: "1,500", lineTotal: 1500 },
      ],
      total: 8500,
      currency: "RWF",
      hasUnpriced: false,
      table: "TEST",
      phone: "",
      note: "Printer test - no order",
      status: "new",
      createdAt: new Date().toISOString(),
      printedAt: "",
    };
    if (!queuePrint(sample, ticketsFor(settings.tickets), { auto: false, reprint: false, via: printer, label: "Test print", key: "test" })) {
      notify("The test is already printing");
    }
  };

  /* ----- Ordering switch and statuses ----- */

  const toggleOpen = async () => {
    const next = !open;
    setSwitching(true);
    try {
      const res = await updateOrdersOpen(await getIdToken(), next);
      if (!res.ok) throw new Error(res.error);
      setOpen(next);
      notify(next ? "Orders are ON — guests can order from the menu" : "Orders are OFF — no new orders can come in");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not change ordering", "error");
    } finally {
      setSwitching(false);
    }
  };

  const setStatus = async (order: Order, status: OrderStatus) => {
    seen(order.id);
    pendingStatus.current.set(order.id, { status, until: msFromNow(30_000) });
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
    try {
      const res = await updateOrderStatus(await getIdToken(), order.id, status);
      if (!res.ok) throw new Error(res.error);
    } catch (err) {
      pendingStatus.current.delete(order.id);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: order.status } : o)));
      notify(err instanceof Error ? err.message : "Could not update the order", "error");
    }
  };

  // Today at a glance — recalculated from the live list, so it changes the moment an order does.
  const todays = orders.filter((o) => o.day === kigaliDay(now));
  const today = {
    count: todays.filter((o) => o.status !== "cancelled").length,
    open: todays.filter((o) => o.status === "new" || o.status === "preparing").length,
    done: todays.filter((o) => o.status === "done").length,
    cancelled: todays.filter((o) => o.status === "cancelled").length,
    revenue: todays.filter((o) => o.status === "done").reduce((n, o) => n + o.total, 0),
    currency: todays[0]?.currency ?? "RWF",
  };

  const shown = orders.filter((o) =>
    filter === "active" ? o.status === "new" || o.status === "preparing" : filter === "done" ? o.status === "done" || o.status === "cancelled" : true
  );

  const printerChoices: { kind: PrinterKind; label: string; hint: string; Icon: typeof Bluetooth }[] = [
    { kind: "bluetooth", label: "Bluetooth printer", hint: "Thermal printer paired over Bluetooth", Icon: Bluetooth },
    { kind: "usb", label: "USB printer", hint: "Thermal printer plugged into this device", Icon: Usb },
    { kind: "serial", label: "COM port printer", hint: "Bluetooth printer paired in Windows, or USB-serial", Icon: Plug },
    { kind: "system", label: "Printer installed on this computer", hint: "Wi-Fi, network or any printer with a driver", Icon: Monitor },
  ];

  const tray = (
    <>
      {alert && (
        <div role="alert" className="fixed left-1/2 top-24 z-[95] flex w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 rounded-2xl bg-[#f08c6c] p-4 text-white shadow-2xl">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <BellRing className="h-5 w-5 animate-bounce" />
          </span>
          <p className="flex-1 font-black">{alert.text}</p>
          <button type="button" onClick={acknowledge} className="rounded-xl bg-white px-4 py-2 text-sm font-black text-[#c4532f] shadow">
            Seen
          </button>
        </div>
      )}
      <PrintTray jobs={jobs} onCancel={(id) => queue.cancel(id)} onDismiss={(id) => queue.dismiss(id)} />
    </>
  );
  if (!visible) return tray;

  return (
    <div className="space-y-6">
      {tray}
      {/* Accepting orders */}
      <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <div className="flex-1">
            <h2 className="flex items-center gap-2 text-xl font-black text-gray-900">
              <ChefHat className="h-6 w-6" style={{ color: BRAND }} /> Track order
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {open
                ? "Guests see a “Make an order” button on your menu. New orders appear below and print automatically."
                : "Ordering is off. Guests only see the menu. Your earlier orders stay below."}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleOpen}
            disabled={switching}
            role="switch"
            aria-checked={open}
            className={`flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-black transition-colors disabled:opacity-60 ${
              open ? "bg-green-600 text-white shadow-lg shadow-green-600/20" : "bg-gray-100 text-gray-700"
            }`}
          >
            {switching ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <span className={`relative h-6 w-11 rounded-full transition-colors ${open ? "bg-white/30" : "bg-gray-300"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${open ? "left-[1.375rem]" : "left-0.5"}`} />
              </span>
            )}
            {open ? "Accepting orders" : "Orders are off"}
          </button>
        </div>
        {open && !printer && (
          <p className="flex items-center gap-2 border-t border-amber-100 bg-amber-50 px-6 py-3 text-sm font-medium text-amber-800">
            <CircleAlert className="h-4 w-4 shrink-0" /> No printer connected on this device — orders will only show on screen.
          </p>
        )}
      </section>

      {/* Printer */}
      <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-black text-gray-900">
            <Printer className="h-5 w-5" style={{ color: BRAND }} /> Printer
          </h3>
          {printer ? (
            <span className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
              <span className="h-2 w-2 rounded-full bg-green-500" /> {printer.name}
            </span>
          ) : (
            <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-500">Not connected</span>
          )}
        </div>

        {printer ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={testPrint} className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white">
              <Printer className="h-4 w-4" /> Print test
            </button>
            <button type="button" onClick={disconnect} className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">
              <Unplug className="h-4 w-4" /> Disconnect
            </button>
          </div>
        ) : (
          <>
            {settings.saved && (
              <button
                type="button"
                onClick={reconnect}
                disabled={connecting !== null}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-black text-white disabled:opacity-60"
                style={{ backgroundColor: BRAND }}
              >
                {connecting === "reconnect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Reconnect {settings.saved.name}
              </button>
            )}
            {connecting !== null && (
              <div className="mt-5 flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                <span className="flex-1">{connecting === "reconnect" ? "Reconnecting to your printer…" : "Connecting to the printer…"}</span>
                <button type="button" onClick={cancelConnect} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100">
                  Cancel
                </button>
              </div>
            )}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {printerChoices.map(({ kind, label, hint, Icon }) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => connect(kind)}
                  disabled={!support[kind] || connecting !== null}
                  className="flex items-start gap-3 rounded-2xl border border-gray-200 p-4 text-left transition-colors hover:border-[#f08c6c] hover:bg-[#fff8f5] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-gray-200 disabled:hover:bg-transparent"
                >
                  <span className="rounded-xl bg-[#fff1ec] p-2.5" style={{ color: BRAND }}>
                    {connecting === kind ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-gray-900">{label}</span>
                    <span className="block text-xs text-gray-500">{support[kind] ? hint : "Open the dashboard in Chrome or Edge to use this"}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-gray-100 pt-5 text-sm">
          <label className="flex items-center gap-2 font-semibold text-gray-700">
            Paper width
            <select
              value={settings.width}
              onChange={(e) => saveSettings({ ...settings, width: Number(e.target.value) === 58 ? 58 : 80 })}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 font-bold"
            >
              <option value={80}>80 mm</option>
              <option value={58}>58 mm</option>
            </select>
          </label>
          <label className="flex items-center gap-2 font-semibold text-gray-700">
            For each new order print
            <select
              value={settings.tickets}
              onChange={(e) => saveSettings({ ...settings, tickets: e.target.value as PrinterSettings["tickets"] })}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 font-bold"
            >
              <option value="receipt">Receipt</option>
              <option value="kitchen">Kitchen ticket</option>
              <option value="both">Kitchen ticket + receipt</option>
            </select>
          </label>
          <label className="flex cursor-pointer items-center gap-2 font-semibold text-gray-700">
            <input type="checkbox" checked={settings.auto} onChange={(e) => saveSettings({ ...settings, auto: e.target.checked })} className="h-4 w-4 accent-[#f08c6c]" />
            Print new orders automatically on this device
          </label>
          <button type="button" onClick={() => setShowHelp((v) => !v)} className="font-bold text-[#d9694a] underline-offset-2 hover:underline">
            {showHelp ? "Hide printer help" : "Printer help"}
          </button>
          <button
            type="button"
            onClick={() => setEditingPayment((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl border border-[#f4d4ca] px-3 py-1.5 font-bold text-[#d9694a] hover:bg-[#fff8f5]"
          >
            <Wallet className="h-4 w-4" /> {payment.code ? "Payment on receipt: on" : "Add payment to receipt"}
          </button>
        </div>

        {editingPayment && <PaymentEditor payment={payment} onSave={savePayment} onClose={() => setEditingPayment(false)} />}

        {showHelp && (
          <div className="mt-4 space-y-3 rounded-2xl bg-gray-50 p-5 text-sm leading-relaxed text-gray-600">
            <p>
              <strong className="text-gray-900">Keep this page open</strong> on the device connected to the printer (a computer, laptop or Android
              tablet at the counter). Orders print while this dashboard is open — you can use the other tabs meanwhile.
            </p>
            <p>
              <strong className="text-gray-900">Bluetooth / USB / COM port</strong> print instantly with no window, in Google Chrome or Microsoft Edge.
              They work with thermal receipt printers (58 or 80 mm) — most printers sold for shops and restaurants. iPhones and iPads can&apos;t connect
              to printers this way.
            </p>
            <p>
              <strong className="text-gray-900">Printer installed on this computer</strong> works with every printer Windows or Mac can print to,
              including Wi-Fi printers. The print window appears for each order; to skip it, make a Chrome shortcut for printing:
            </p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Make the receipt printer the <em>default printer</em> in the computer&apos;s settings.</li>
              <li>Right-click the Chrome shortcut → Properties. At the end of <em>Target</em>, add a space and <code className="rounded bg-white px-1">--kiosk-printing</code>.</li>
              <li>Close Chrome completely, open it from that shortcut and sign in to this dashboard. Receipts now print straight away.</li>
            </ol>
            <p>With several devices open, each order still prints only once.</p>
          </div>
        )}
      </section>

      {/* Orders */}
      <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-black text-gray-900">Orders</h3>
          <span className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            {live === "live" ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                Live
              </>
            ) : live === "polling" ? (
              <>
                <RefreshCw className="h-3.5 w-3.5" /> Checking every 15 s
              </>
            ) : (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Connecting
              </>
            )}
            <span className="text-gray-300">·</span>
            <Volume2 className="h-3.5 w-3.5" /> Rings 5 s on new orders — tap Seen to stop
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {(
            [
              ["Orders today", String(today.count)],
              ["In progress", String(today.open)],
              ["Done", String(today.done)],
              ["Cancelled", String(today.cancelled)],
              ["Revenue (done)", `${formatAmount(today.revenue)} ${today.currency}`],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-gray-50 px-3.5 py-2.5">
              <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</dt>
              <dd className="mt-0.5 text-lg font-black text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex gap-2">
          {(
            [
              ["active", `To do (${orders.filter((o) => o.status === "new" || o.status === "preparing").length})`],
              ["done", "Finished"],
              ["all", "All"],
            ] as [Filter, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-full px-4 py-2 text-xs font-bold ${filter === id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {!loaded ? (
          <p className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading orders…
          </p>
        ) : shown.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">
            {filter === "active" ? (open ? "No orders waiting. New orders appear here instantly." : "No orders waiting.") : "No orders here yet."}
          </p>
        ) : (
          <ul className="mt-5 grid gap-4 lg:grid-cols-2">
            {shown.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                now={now}
                job={latestJob(jobs, o.id)}
                onPrint={(ticket) => manualPrint(o, ticket)}
                onCancelPrint={(id) => queue.cancel(id)}
                onStatus={(s) => setStatus(o, s)}
              />
            ))}
          </ul>
        )}
        <p className="mt-5 text-center text-xs text-gray-400">Orders are kept for {ORDER_LIMITS.keepDays} days.</p>
      </section>
    </div>
  );
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  new: "bg-[#fff1ec] text-[#c4532f]",
  preparing: "bg-amber-50 text-amber-700",
  done: "bg-green-50 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

function latestJob(jobs: PrintJob[], orderId: string): PrintJob | undefined {
  for (let i = jobs.length - 1; i >= 0; i--) if (jobs[i].orderId === orderId) return jobs[i];
  return undefined;
}

const JOB_STYLE: Record<PrintJob["status"], string> = {
  preparing: "bg-gray-100 text-gray-600",
  printing: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
  failed: "bg-red-50 text-red-700",
};

/** Print jobs in progress (and recent results), visible on every dashboard tab. */
function PrintTray({ jobs, onCancel, onDismiss }: { jobs: PrintJob[]; onCancel: (id: string) => void; onDismiss: (id: string) => void }) {
  if (jobs.length === 0) return null;
  return (
    <div className="fixed bottom-4 left-4 z-[90] w-[min(22rem,calc(100vw-2rem))] space-y-2" aria-live="polite">
      {jobs.slice(-4).map((j) => (
        <div key={j.id} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-3.5 shadow-xl">
          <span className={`mt-0.5 rounded-lg p-1.5 ${JOB_STYLE[j.status]}`}>
            {isActive(j) ? <Loader2 className="h-4 w-4 animate-spin" /> : j.status === "completed" ? <Check className="h-4 w-4" /> : j.status === "failed" ? <CircleAlert className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-gray-900">{j.label}</p>
            <p className="text-xs font-semibold text-gray-500">{JOB_LABEL[j.status]}{j.auto ? " · automatic" : ""}</p>
            {j.error && <p className="mt-1 text-xs text-red-600">{j.error}</p>}
          </div>
          {isActive(j) ? (
            <button type="button" onClick={() => onCancel(j.id)} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          ) : (
            <button type="button" onClick={() => onDismiss(j.id)} aria-label="Dismiss" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function OrderCard({
  order,
  now,
  job,
  onPrint,
  onCancelPrint,
  onStatus,
}: {
  order: Order;
  now: number;
  job: PrintJob | undefined;
  onPrint: (ticket: TicketKind) => void;
  onCancelPrint: (jobId: string) => void;
  onStatus: (s: OrderStatus) => void;
}) {
  const busy = job !== undefined && isActive(job);
  const next: { status: OrderStatus; label: string } | null =
    order.status === "new" ? { status: "preparing", label: "Start preparing" } : order.status === "preparing" ? { status: "done", label: "Mark done" } : null;
  return (
    <li className={`rounded-2xl border p-5 ${order.status === "new" ? "border-[#f5b8a4] bg-[#fffaf8]" : "border-gray-100"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-black text-gray-900">#{order.number}</p>
          <p className="text-xs text-gray-500" title={orderTime(order.createdAt)}>
            {ago(order.createdAt, now)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`rounded-full px-3 py-1 text-xs font-black ${STATUS_STYLE[order.status]}`}>{STATUS_LABEL[order.status]}</span>
          <span className={`flex items-center gap-1 text-[11px] font-bold ${order.printedAt ? "text-green-600" : "text-amber-600"}`}>
            {order.printedAt ? <Check className="h-3 w-3" /> : <CircleAlert className="h-3 w-3" />}
            {order.printedAt ? "Printed" : "Not printed"}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {order.table && <span className="rounded-xl bg-gray-900 px-3 py-1.5 text-sm font-black text-white">Table {order.table}</span>}
        {order.phone && (
          <a href={`tel:${order.phone}`} className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-1.5 text-sm font-bold text-gray-800 hover:bg-gray-200">
            <Phone className="h-3.5 w-3.5" /> {order.phone}
          </a>
        )}
      </div>

      <ul className="mt-4 space-y-1.5 text-sm">
        {order.items.map((l, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span className="text-gray-800">
              <strong>{l.qty} ×</strong> {l.name}
            </span>
            <span className="whitespace-nowrap text-gray-500">{l.lineTotal === null ? l.priceText || "—" : formatAmount(l.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex justify-between border-t border-dashed border-gray-200 pt-3 text-sm font-black text-gray-900">
        <span>Total</span>
        <span>
          {formatAmount(order.total)} {order.currency}
          {order.hasUnpriced && <span className="ml-1 font-medium text-gray-400">+ counter prices</span>}
        </span>
      </p>
      {order.note && (
        <p className="mt-3 flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <StickyNote className="mt-0.5 h-4 w-4 shrink-0" /> {order.note}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {next && (
          <button type="button" onClick={() => onStatus(next.status)} className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-black text-white hover:bg-black">
            {next.label}
          </button>
        )}
        {busy ? (
          <span className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {JOB_LABEL[job!.status]}…
            <button type="button" onClick={() => onCancelPrint(job!.id)} className="ml-1 rounded-md bg-white px-2 py-0.5 text-blue-700 shadow-sm hover:bg-blue-100">
              Cancel
            </button>
          </span>
        ) : (
          <>
            <button type="button" onClick={() => onPrint("receipt")} className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
              <Printer className="h-3.5 w-3.5" /> {order.printedAt ? "Reprint receipt" : "Receipt"}
            </button>
            <button type="button" onClick={() => onPrint("kitchen")} className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
              <CookingPot className="h-3.5 w-3.5" /> Kitchen
            </button>
            {job?.status === "failed" && <span className="self-center text-xs font-bold text-red-600">Print failed</span>}
          </>
        )}
        {(order.status === "new" || order.status === "preparing") && (
          <button type="button" onClick={() => onStatus("cancelled")} className="ml-auto flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-gray-400 hover:bg-red-50 hover:text-red-600">
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
        )}
        {(order.status === "done" || order.status === "cancelled") && (
          <button type="button" onClick={() => onStatus("new")} className="ml-auto rounded-xl px-3 py-2 text-xs font-bold text-gray-400 hover:bg-gray-50 hover:text-gray-700">
            Reopen
          </button>
        )}
      </div>
    </li>
  );
}

/** MoMo (or any) pay code printed on receipts: a QR code that opens the phone dialler, with the code below. */
function PaymentEditor({
  payment,
  onSave,
  onClose,
}: {
  payment: ReceiptPayment;
  onSave: (p: ReceiptPayment) => Promise<boolean>;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(payment.label || "Pay with MTN MoMo");
  const [code, setCode] = useState(payment.code);
  const [name, setName] = useState(payment.name);
  const [busy, setBusy] = useState(false);
  const clean = code.replace(/\s+/g, "");
  const valid = /^[0-9*#+]{3,40}$/.test(clean);

  const save = async (next: ReceiptPayment) => {
    setBusy(true);
    if (await onSave(next)) onClose();
    setBusy(false);
  };

  return (
    <div className="mt-4 rounded-2xl border border-[#f4d4ca] bg-[#fffaf8] p-5">
      <p className="font-bold text-gray-900">Payment on receipts</p>
      <p className="mt-1 text-sm text-gray-500">
        Type the code guests dial to pay you (MTN MoMo pay code, Airtel Money or any USSD code). Every receipt then ends with a QR code for it
        instead of the ScanDish logo — scanning it opens the phone dialler with the code ready — and the code written below.
      </p>
      <div className="mt-4 grid gap-5 sm:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700">
            Title
            <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-normal" />
          </label>
          <label className="block text-sm font-semibold text-gray-700">
            USSD / pay code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="tel"
              placeholder="*182*8*1*123456#"
              maxLength={44}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-mono text-base font-normal"
            />
          </label>
          <label className="block text-sm font-semibold text-gray-700">
            Account name (optional — guests check they pay the right place)
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="KIZA RESTAURANT LTD" className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-normal" />
          </label>
          {clean && !valid && <p className="text-sm font-medium text-red-600">Use only digits, * and # — for example *182*8*1*123456#</p>}
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-4 text-center">
          {valid ? (
            <>
              <QRCodeSVG value={paymentQrValue(clean)} size={132} marginSize={1} />
              <p className="mt-2 font-mono text-sm font-bold">{clean}</p>
              <p className="text-[11px] text-gray-400">Receipt preview</p>
            </>
          ) : (
            <p className="w-32 text-xs text-gray-400">The QR code appears here</p>
          )}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !valid}
          onClick={() => void save({ label: label.trim(), code: clean, name: name.trim() })}
          className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
        </button>
        {payment.code && (
          <button type="button" disabled={busy} onClick={() => void save({ label: "", code: "", name: "" })} className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-500 hover:bg-red-50 hover:text-red-600">
            Remove from receipts
          </button>
        )}
        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100">
          Close
        </button>
      </div>
      <p className="mt-3 text-xs text-gray-400">
        Changing this needs the Secure Dashboard PIN (when one is set). Android phones open the dialler from the QR code; on iPhone, guests type the
        code shown under it.
      </p>
    </div>
  );
}
