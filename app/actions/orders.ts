"use server";

import { dashboardAccess, securityLog } from "@/lib/server/dashboard-security";
import { logActivity } from "@/lib/server/activity";
import { claimOrderPrint, listOrders, pruneOldOrders, releaseOrderPrint, setOrderStatus, setOrdersOpen } from "@/lib/server/orders";
import { fail } from "@/lib/server/result";
import { saveReceiptPayment } from "@/lib/server/restaurants";
import { STATUS_LABEL, type Order, type OrderStatus } from "@/lib/orders";
import type { ActionResult, ReceiptPayment } from "@/lib/types";

/** Switches "Accepting orders" on or off; the menu page shows or hides its order button right away. */
export async function updateOrdersOpen(idToken: string, open: boolean): Promise<ActionResult> {
  try {
    const access = await dashboardAccess(idToken);
    const user = access.user;
    const { name, slug } = await setOrdersOpen(user.uid, open === true);
    await securityLog(access, open ? "Orders switched on" : "Orders switched off");
    await logActivity({
      type: "restaurant.orders_toggled",
      message: `${name} ${open ? "started" : "stopped"} accepting table orders`,
      actor: { uid: user.uid, email: user.email },
      target: { kind: "restaurant", id: user.uid, name },
      meta: { slug, open: open === true },
    });
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err, "Could not change ordering");
  }
}

/** Latest orders, when live updates are unavailable. */
export async function loadOrders(idToken: string): Promise<ActionResult<Order[]>> {
  try {
    const { user } = await dashboardAccess(idToken);
    return { ok: true, data: await listOrders(user.uid) };
  } catch (err) {
    return fail(err, "Could not load orders");
  }
}

export async function updateOrderStatus(idToken: string, orderId: string, status: OrderStatus): Promise<ActionResult> {
  try {
    const access = await dashboardAccess(idToken);
    const number = await setOrderStatus(access.user.uid, orderId, status);
    await securityLog(access, "Order status updated", `Order #${number} → ${STATUS_LABEL[status] ?? status}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err, "Could not update the order");
  }
}

/** true = this device should print it now (nobody else has). */
export async function claimPrint(idToken: string, orderId: string, station: string, force = false): Promise<ActionResult<boolean>> {
  try {
    const { user } = await dashboardAccess(idToken);
    return { ok: true, data: await claimOrderPrint(user.uid, orderId, String(station ?? ""), force === true) };
  } catch (err) {
    return fail(err, "Could not mark the order printed");
  }
}

export async function releasePrint(idToken: string, orderId: string): Promise<ActionResult> {
  try {
    const { user } = await dashboardAccess(idToken);
    await releaseOrderPrint(user.uid, orderId);
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err, "Could not update the order");
  }
}

/** Payment details printed on receipts. A money destination, so it needs the Secure Dashboard PIN. */
export async function updateReceiptPayment(idToken: string, input: unknown): Promise<ActionResult<ReceiptPayment>> {
  try {
    const access = await dashboardAccess(idToken, { protect: true });
    const payment = await saveReceiptPayment(access.user.uid, input);
    await securityLog(access, "Receipt payment details changed", payment.code ? `${payment.label} · ${payment.code}${payment.name ? ` · ${payment.name}` : ""}` : "Removed");
    return { ok: true, data: payment };
  } catch (err) {
    return fail(err, "Could not save the payment details");
  }
}

/** Removes orders older than the keep period (run when Track order opens). */
export async function pruneOrders(idToken: string): Promise<ActionResult<number>> {
  try {
    const { user } = await dashboardAccess(idToken);
    return { ok: true, data: await pruneOldOrders(user.uid) };
  } catch (err) {
    return fail(err, "Could not tidy old orders");
  }
}
