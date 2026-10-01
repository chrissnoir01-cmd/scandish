"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Loader2, Minus, Phone, Plus, ShoppingBag, Trash2, Wallet, X } from "lucide-react";
import { ORDER_LIMITS, formatAmount, itemKey, menuCurrency, normalizeGuestPhone, parsePrice } from "@/lib/orders";
import { paymentQrValue as paymentDialLink } from "@/lib/printing/receipt";
import type { MenuItem, PublicRestaurant, ReceiptPayment } from "@/lib/types";

interface CartLine {
  key: string;
  id: string;
  name: string;
  category: string;
  priceText: string;
  unitPrice: number | null;
  qty: number;
}

interface OrderContextValue {
  /** The restaurant takes orders from this page. */
  enabled: boolean;
  /** The guest ticked "Make an order", so dishes show add buttons. */
  active: boolean;
  setActive: (on: boolean) => void;
  qtyOf: (key: string) => number;
  change: (item: MenuItem, category: string, delta: number) => void;
  accent: string;
  accentText: string;
}

const DISABLED: OrderContextValue = {
  enabled: false,
  active: false,
  setActive: () => {},
  qtyOf: () => 0,
  change: () => {},
  accent: "#111111",
  accentText: "#ffffff",
};

const OrderContext = createContext<OrderContextValue>(DISABLED);
export const useOrder = () => useContext(OrderContext);

const cartKey = (slug: string) => `scandish.cart.${slug}`;

/**
 * Table ordering for a menu page. When the restaurant has ordering switched on, it adds the cart,
 * the floating order bar and the order sheet; templates place <OrderToggle/> and <AddToOrder/>.
 * Otherwise it renders the page untouched.
 */
export function OrderProvider({
  restaurant,
  accent,
  accentText = "#ffffff",
  children,
}: {
  restaurant: PublicRestaurant;
  accent: string;
  accentText?: string;
  children: React.ReactNode;
}) {
  if (!restaurant.ordering) return <>{children}</>;
  return (
    <ActiveOrdering restaurant={restaurant} accent={accent} accentText={accentText}>
      {children}
    </ActiveOrdering>
  );
}

function ActiveOrdering({
  restaurant,
  accent,
  accentText,
  children,
}: {
  restaurant: PublicRestaurant;
  accent: string;
  accentText: string;
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [closedMessage, setClosedMessage] = useState("");
  const restored = useRef(false);
  const currency = useMemo(() => menuCurrency(restaurant.menu), [restaurant.menu]);

  // A reload (or a phone switching apps) keeps the cart for this visit.
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(cartKey(restaurant.slug)) ?? "null");
      if (Array.isArray(saved?.cart) && saved.cart.length) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- the saved cart only exists in the browser
        setCart(saved.cart as CartLine[]);
        setActive(true);
      }
    } catch {
      // Nothing saved or storage blocked.
    }
    restored.current = true;
  }, [restaurant.slug]);

  useEffect(() => {
    if (!restored.current) return;
    try {
      sessionStorage.setItem(cartKey(restaurant.slug), JSON.stringify({ cart }));
    } catch {
      // Not saved; the cart still works for this page view.
    }
  }, [cart, restaurant.slug]);

  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const count = cart.reduce((n, l) => n + l.qty, 0);
  const barVisible = count > 0 && !sheetOpen && !closedMessage;

  // Floating buttons on the page (WhatsApp) move up above the order bar.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--order-bar", barVisible ? "5.25rem" : "0px");
    return () => {
      root.style.removeProperty("--order-bar");
    };
  }, [barVisible]);

  const change = useCallback((item: MenuItem, category: string, delta: number) => {
    const key = itemKey(item, category);
    setCart((prev) => {
      const line = prev.find((l) => l.key === key);
      if (!line) {
        if (delta <= 0 || prev.length >= ORDER_LIMITS.lines) return prev;
        return [
          ...prev,
          { key, id: item.id, name: item.name, category, priceText: item.price, unitPrice: parsePrice(item.price), qty: Math.min(delta, ORDER_LIMITS.qtyPerLine) },
        ];
      }
      const qty = Math.min(line.qty + delta, ORDER_LIMITS.qtyPerLine);
      return qty <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, qty } : l));
    });
  }, []);

  const value = useMemo<OrderContextValue>(
    () => ({
      enabled: !closedMessage,
      active: active && !closedMessage,
      setActive,
      qtyOf: (key) => cart.find((l) => l.key === key)?.qty ?? 0,
      change,
      accent,
      accentText,
    }),
    [active, cart, change, accent, accentText, closedMessage]
  );

  const total = cart.reduce((n, l) => n + (l.unitPrice ?? 0) * l.qty, 0);

  return (
    <OrderContext.Provider value={value}>
      {children}

      {barVisible && (
        <div className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4 pt-2" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="mx-auto flex w-full max-w-md items-center gap-3 rounded-2xl px-4 py-3.5 text-left font-sans shadow-[0_12px_40px_-8px_rgba(0,0,0,0.45)] transition-transform active:scale-[0.99]"
            style={{ backgroundColor: accent, color: accentText }}
          >
            <span className="relative">
              <ShoppingBag className="h-6 w-6" />
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-black text-black">
                {count}
              </span>
            </span>
            <span className="ml-1 flex-1">
              <span className="block text-sm font-bold">View your order</span>
              <span className="block text-xs opacity-80">
                {count} item{count > 1 ? "s" : ""}
                {total > 0 && ` · ${formatAmount(total)} ${currency}`}
              </span>
            </span>
            <span className="rounded-xl bg-black/15 px-3 py-1.5 text-xs font-bold">Open</span>
          </button>
        </div>
      )}

      {sheetOpen && (
        <OrderSheet
          slug={restaurant.slug}
          payment={restaurant.payment}
          name={restaurant.name}
          cart={cart}
          currency={currency}
          accent={accent}
          accentText={accentText}
          onQty={(line, delta) =>
            setCart((prev) =>
              prev
                .map((l) => (l.key === line.key ? { ...l, qty: Math.min(l.qty + delta, ORDER_LIMITS.qtyPerLine) } : l))
                .filter((l) => l.qty > 0)
            )
          }
          onRemove={(line) => setCart((prev) => prev.filter((l) => l.key !== line.key))}
          onClose={closeSheet}
          onSent={() => setCart([])}
          onClosedByRestaurant={(msg) => {
            setClosedMessage(msg);
            setCart([]);
          }}
        />
      )}

      {closedMessage && !sheetOpen && (
        <div className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4">
          <div className="mx-auto flex max-w-md items-start gap-3 rounded-2xl bg-neutral-900 px-4 py-3.5 font-sans text-sm text-white shadow-2xl">
            <span className="flex-1">{closedMessage}</span>
            <button type="button" onClick={() => setClosedMessage("")} aria-label="Close" className="opacity-70 hover:opacity-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </OrderContext.Provider>
  );
}

/* ---------- Order sheet ---------- */

function OrderSheet({
  slug,
  payment,
  name,
  cart,
  currency,
  accent,
  accentText,
  onQty,
  onRemove,
  onClose,
  onSent,
  onClosedByRestaurant,
}: {
  slug: string;
  payment: ReceiptPayment | undefined;
  name: string;
  cart: CartLine[];
  currency: string;
  accent: string;
  accentText: string;
  onQty: (line: CartLine, delta: number) => void;
  onRemove: (line: CartLine) => void;
  onClose: () => void;
  onSent: () => void;
  onClosedByRestaurant: (msg: string) => void;
}) {
  const [table, setTable] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<{ number: number; table: string; total: number; currency: string; hasUnpriced: boolean } | null>(null);
  /** Same code for every retry of this order, so a lost connection can't create it twice. */
  const sendRef = useRef("");
  // A changed order is a new order.
  useEffect(() => {
    sendRef.current = "";
  }, [cart]);

  // Remember the table for the next round of ordering in this visit.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- saved in the browser during this visit
      setTable(sessionStorage.getItem(`scandish.table.${slug}`) ?? "");
      setPhone(sessionStorage.getItem(`scandish.phone.${slug}`) ?? "");
    } catch {
      // Storage blocked.
    }
  }, [slug]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const total = cart.reduce((n, l) => n + (l.unitPrice ?? 0) * l.qty, 0);
  const unpriced = cart.some((l) => l.unitPrice === null);

  const send = async () => {
    setError("");
    const t = table.trim();
    const p = normalizeGuestPhone(phone);
    if (!t && !phone.trim()) return setError("Enter your table number or your phone number.");
    if (p === null) return setError("That phone number doesn't look right.");
    setSending(true);
    sendRef.current ||= crypto.randomUUID().replace(/-/g, "");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          items: cart.map((l) => ({ id: l.id, name: l.name, category: l.category, qty: l.qty })),
          table: t,
          phone: p,
          note: note.trim(),
          website,
          ref: sendRef.current,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.closed) {
        onClosedByRestaurant(data.error);
        onClose();
        return;
      }
      if (!res.ok) throw new Error(data.error || "Your order could not be sent. Please try again.");
      try {
        sessionStorage.setItem(`scandish.table.${slug}`, t);
        sessionStorage.setItem(`scandish.phone.${slug}`, p);
      } catch {
        // Not remembered.
      }
      setSent({ number: data.number, table: t, total: Number(data.total) || 0, currency: data.currency || "RWF", hasUnpriced: data.hasUnpriced === true });
      sendRef.current = "";
      setNote("");
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your order could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const field =
    "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-base text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400";

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 font-sans sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your order"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white text-neutral-900 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <p className="text-lg font-bold">{sent ? "Order sent" : "Your order"}</p>
            <p className="text-xs text-neutral-500">{name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center px-6 pb-8 pt-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: accent, color: accentText }}>
              <Check className="h-8 w-8" />
            </span>
            <p className="mt-5 text-2xl font-black">Order #{sent.number}</p>
            <p className="mt-2 text-neutral-600">
              The restaurant has received your order{sent.table ? ` for table ${sent.table}` : ""}. Please keep this number.
            </p>
            {payment?.code && <PayNow payment={payment} total={sent.total} currency={sent.currency} hasUnpriced={sent.hasUnpriced} accent={accent} accentText={accentText} />}
            <button
              type="button"
              onClick={onClose}
              className={`mt-6 w-full rounded-2xl py-3.5 font-bold ${payment?.code ? "border border-neutral-200 text-neutral-700" : ""}`}
              style={payment?.code ? undefined : { backgroundColor: accent, color: accentText }}
            >
              Back to the menu
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {cart.length === 0 ? (
                <p className="py-8 text-center text-neutral-500">Your order is empty. Tap + on a dish to add it.</p>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {cart.map((l) => (
                    <li key={l.key} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{l.name}</p>
                        <p className="text-xs text-neutral-500">
                          {l.unitPrice === null ? l.priceText || "Price at the counter" : `${formatAmount(l.unitPrice * l.qty)} ${currency}`}
                        </p>
                      </div>
                      <Stepper qty={l.qty} onMinus={() => onQty(l, -1)} onPlus={() => onQty(l, 1)} accent={accent} accentText={accentText} />
                      <button type="button" onClick={() => onRemove(l)} aria-label={`Remove ${l.name}`} className="p-1.5 text-neutral-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {cart.length > 0 && (
                <div className="mt-2 flex items-baseline justify-between border-t border-neutral-200 pt-3">
                  <span className="font-bold">Total</span>
                  <span className="text-lg font-black">
                    {formatAmount(total)} {currency}
                    {unpriced && <span className="block text-right text-[11px] font-medium text-neutral-500">+ items priced at the counter</span>}
                  </span>
                </div>
              )}

              <div className="mt-5 space-y-3">
                <p className="text-sm font-semibold text-neutral-700">Where should we bring it?</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-neutral-500">Table number</span>
                    <input value={table} onChange={(e) => setTable(e.target.value)} maxLength={ORDER_LIMITS.table} inputMode="text" placeholder="e.g. 7" className={field} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-neutral-500">Phone number</span>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} type="tel" inputMode="tel" placeholder="07…" className={field} />
                  </label>
                </div>
                <p className="text-xs text-neutral-500">Fill in at least one — or both.</p>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-neutral-500">Note for the kitchen (optional)</span>
                  <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={ORDER_LIMITS.note} placeholder="e.g. no onions, well done" className={field} />
                </label>
                {/* Left empty by people; bots fill it in. */}
                <input value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
              </div>
              {error && <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">{error}</p>}
            </div>

            <div className="border-t border-neutral-100 px-5 py-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
              <button
                type="button"
                onClick={send}
                disabled={sending || cart.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold disabled:opacity-50"
                style={{ backgroundColor: accent, color: accentText }}
              >
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                {sending ? "Sending…" : "Send order"}
              </button>
              <p className="mt-2 text-center text-[11px] text-neutral-400">Pay at the restaurant as usual.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stepper({
  qty,
  onMinus,
  onPlus,
  accent,
  accentText,
  small = false,
}: {
  qty: number;
  onMinus: () => void;
  onPlus: () => void;
  accent: string;
  accentText: string;
  small?: boolean;
}) {
  const btn = small ? "h-8 w-8" : "h-9 w-9";
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white p-0.5 font-sans shadow-sm ring-1 ring-black/10">
      <button type="button" onClick={onMinus} aria-label="One less" className={`${btn} flex items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100`}>
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-6 text-center text-sm font-black text-neutral-900">{qty}</span>
      <button
        type="button"
        onClick={onPlus}
        aria-label="One more"
        className={`${btn} flex items-center justify-center rounded-full`}
        style={{ backgroundColor: accent, color: accentText }}
      >
        <Plus className="h-4 w-4" />
      </button>
    </span>
  );
}

/* ---------- Pieces the templates place ---------- */

/** "Make an order" switch above the menu. Renders nothing unless the restaurant takes orders. */
export function OrderToggle({ dark = false, className = "" }: { dark?: boolean; className?: string }) {
  const { enabled, active, setActive, accent, accentText } = useOrder();
  if (!enabled) return null;
  return (
    <label
      className={`inline-flex cursor-pointer select-none items-center gap-3 rounded-2xl border px-4 py-3 font-sans transition-colors ${
        dark ? "border-white/15 bg-white/5 text-white" : "border-black/10 bg-white text-neutral-900 shadow-sm"
      } ${className}`}
      style={active ? { borderColor: accent } : undefined}
    >
      <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors peer-focus-visible:ring-2"
        style={active ? { backgroundColor: accent, borderColor: accent, color: accentText } : { borderColor: dark ? "rgba(255,255,255,.4)" : "rgba(0,0,0,.25)" }}
      >
        {active && <Check className="h-4 w-4" strokeWidth={3} />}
      </span>
      <span className="text-left">
        <span className="flex items-center gap-1.5 text-sm font-bold">
          <ShoppingBag className="h-4 w-4" /> Make an order
        </span>
        <span className={`block text-xs ${dark ? "text-white/60" : "text-neutral-500"}`}>
          {active ? "Tap + on the dishes you want" : "Tick to order from your table"}
        </span>
      </span>
    </label>
  );
}

/** Add / quantity control for one dish. Shows only while the guest is making an order. */
export function AddToOrder({ item, category, className = "" }: { item: MenuItem; category: string; className?: string }) {
  const { active, qtyOf, change, accent, accentText } = useOrder();
  if (!active) return null;
  if (!item.available) {
    return <span className={`inline-flex rounded-full bg-neutral-200 px-3 py-1.5 font-sans text-xs font-bold text-neutral-600 ${className}`}>Sold out</span>;
  }
  const qty = qtyOf(itemKey(item, category));
  if (qty === 0) {
    return (
      <button
        type="button"
        onClick={() => change(item, category, 1)}
        aria-label={`Add ${item.name}`}
        className={`inline-flex items-center gap-1 rounded-full px-3.5 py-2 font-sans text-xs font-bold shadow-sm transition-transform active:scale-95 ${className}`}
        style={{ backgroundColor: accent, color: accentText }}
      >
        <Plus className="h-4 w-4" /> Add
      </button>
    );
  }
  return (
    <span className={className}>
      <Stepper qty={qty} onMinus={() => change(item, category, -1)} onPlus={() => change(item, category, 1)} accent={accent} accentText={accentText} small />
    </span>
  );
}

/* ---------- Paying after ordering ---------- */

/** iPhones and iPads refuse to dial codes with * or # from a web page, so they copy the code instead. */
const isApple = () =>
  typeof navigator !== "undefined" && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1));

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers: copy through a temporary text box.
    const box = document.createElement("textarea");
    box.value = text;
    box.setAttribute("readonly", "");
    box.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(box);
    box.select();
    const ok = document.execCommand("copy");
    box.remove();
    return ok;
  }
}

/** Pay button on the confirmation: dial the pay code (Android) or copy it (iPhone), with the amount to pay. */
function PayNow({
  payment,
  total,
  currency,
  hasUnpriced,
  accent,
  accentText,
}: {
  payment: ReceiptPayment;
  total: number;
  currency: string;
  hasUnpriced: boolean;
  accent: string;
  accentText: string;
}) {
  const [copied, setCopied] = useState<"code" | "amount" | null>(null);
  const [apple, setApple] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the device type is only known in the browser
    setApple(isApple());
  }, []);
  const amount = formatAmount(total);

  const copy = async (what: "code" | "amount") => {
    if (await copyText(what === "code" ? payment.code : String(total))) {
      setCopied(what);
      setTimeout(() => setCopied((c) => (c === what ? null : c)), 4000);
    }
  };

  return (
    <div className="mt-6 w-full rounded-2xl border border-neutral-200 p-4 text-left">
      <p className="flex items-center gap-2 font-bold">
        <Wallet className="h-5 w-5" style={{ color: accent }} /> Pay for your order
      </p>
      <p className="mt-0.5 text-sm text-neutral-500">
        {payment.label}
        {payment.name ? ` · ${payment.name}` : ""}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3.5 py-2.5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Amount to pay</p>
          <p className="text-lg font-black">
            {amount} {currency}
          </p>
          {hasUnpriced && <p className="text-[11px] text-neutral-500">+ items priced at the counter</p>}
        </div>
        <button type="button" onClick={() => void copy("amount")} className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-bold">
          {copied === "amount" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />} {copied === "amount" ? "Copied" : "Copy amount"}
        </button>
      </div>

      {/* The code gets a full line on phones, so it is never cut or split in the middle. */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl bg-neutral-50 px-3.5 py-2.5">
        <div className="min-w-0 basis-full sm:basis-auto">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Pay code</p>
          <p className="break-all font-mono text-[17px] font-black leading-snug">{payment.code}</p>
        </div>
        <button type="button" onClick={() => void copy("code")} className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-bold">
          {copied === "code" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />} {copied === "code" ? "Copied" : "Copy code"}
        </button>
      </div>

      {apple ? (
        <>
          <button
            type="button"
            onClick={() => void copy("code")}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-bold"
            style={{ backgroundColor: accent, color: accentText }}
          >
            <Copy className="h-5 w-5" /> Copy code to pay
          </button>
          <p className="mt-2 text-center text-xs text-neutral-500">
            {copied === "code" ? "Code copied — open your Phone app, paste it and press call. " : "iPhones can't dial pay codes from a web page. "}
            When asked, enter {amount} {currency}.
          </p>
        </>
      ) : (
        <>
          <a
            href={paymentDialLink(payment.code)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-bold"
            style={{ backgroundColor: accent, color: accentText }}
          >
            <Phone className="h-5 w-5" /> Dial to pay
          </a>
          <p className="mt-2 text-center text-xs text-neutral-500">
            Opens your phone with the code ready. When asked, enter {amount} {currency}.
          </p>
        </>
      )}
    </div>
  );
}
