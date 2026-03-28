import { MenuItem, SalePayload, SaleResponse, PreOrderPayload, PreOrderResponse, ExpenseResponse } from "@/types";

function apiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "/api").trim();
  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/\/+$/, "");
  }
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withSlash.replace(/\/+$/, "") || "/api";
}

const API_BASE = apiBase();

type MenuItemPayload = Omit<MenuItem, "id">;

export async function fetchMenu(includeUnavailable = false): Promise<MenuItem[]> {
  const path = includeUnavailable ? `${API_BASE}/menu?include_unavailable=true` : `${API_BASE}/menu`;
  const res = await fetch(path);
  if (!res.ok) throw new Error("Failed to fetch menu");
  return res.json();
}

export async function submitSale(payload: SalePayload): Promise<SaleResponse> {
  const res = await fetch(`${API_BASE}/sale`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to submit sale");
  return res.json();
}

export async function createManualSale(payload: {
  date: string;         // YYYY-MM-DDTHH:MM (local datetime string)
  subtotal: number;
  discount?: number;
  payment_method: string;
  customer_name?: string;
  description?: string;
  items?: { id: string; name: string; price: number; quantity: number }[];
}): Promise<SaleResponse> {
  const res = await fetch(`${API_BASE}/sale`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create manual sale");
  return res.json();
}

export async function fetchSales(date?: string): Promise<SaleResponse[]> {
  const url = date ? `${API_BASE}/sales?date=${date}` : `${API_BASE}/sales`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch sales");
  return res.json();
}

export function exportSalesUrl(date?: string): string {
  return date ? `${API_BASE}/sales/export?date=${date}` : `${API_BASE}/sales/export`;
}

export async function resetSales(): Promise<void> {
  const res = await fetch(`${API_BASE}/sales`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to reset sales");
}

export async function deleteSale(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/sale/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete sale");
}

export async function updateSale(
  id: number,
  payload: {
    date: string;
    subtotal: number;
    payment_method: string;
    customer_name?: string;
    description?: string;
  }
): Promise<SaleResponse> {
  const res = await fetch(`${API_BASE}/sale/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update sale");
  return res.json();
}

export async function createMenuItem(
  payload: MenuItemPayload
): Promise<MenuItem> {
  const res = await fetch(`${API_BASE}/menu`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create menu item");
  return res.json();
}

export async function updateMenuItem(
  id: string,
  payload: MenuItemPayload
): Promise<MenuItem> {
  const res = await fetch(`${API_BASE}/menu/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update menu item");
  return res.json();
}

export async function deleteMenuItem(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/menu/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete menu item");
}

export async function fetchPreOrders(): Promise<PreOrderResponse[]> {
  const res = await fetch(`${API_BASE}/preorders`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch pre-orders");
  return res.json();
}

export async function createPreOrder(payload: PreOrderPayload): Promise<PreOrderResponse> {
  const res = await fetch(`${API_BASE}/preorder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create pre-order");
  return res.json();
}

export async function updatePreOrderStatus(
  id: number,
  status: "pending" | "ready" | "done",
  paymentMethod?: string
): Promise<PreOrderResponse> {
  const res = await fetch(`${API_BASE}/preorder/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, ...(paymentMethod ? { payment_method: paymentMethod } : {}) }),
  });
  if (!res.ok) throw new Error("Failed to update pre-order status");
  return res.json();
}

export async function updatePreOrder(
  id: number,
  payload: PreOrderPayload
): Promise<PreOrderResponse> {
  const res = await fetch(`${API_BASE}/preorder/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update pre-order");
  return res.json();
}

export async function deletePreOrder(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/preorder/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete pre-order");
}

export async function fetchExpenses(date?: string): Promise<ExpenseResponse[]> {
  const url = date ? `${API_BASE}/expenses?date=${date}` : `${API_BASE}/expenses`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch expenses");
  return res.json();
}

export async function createExpense(payload: {
  amount: number;
  category: string;
  description: string;
  date?: string;
  paid_from?: string;
}): Promise<ExpenseResponse> {
  const res = await fetch(`${API_BASE}/expense`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create expense");
  return res.json();
}

export async function updateExpense(id: number, payload: {
  amount: number;
  category: string;
  description: string;
  date?: string;
  paid_from?: string;
}): Promise<ExpenseResponse> {
  const res = await fetch(`${API_BASE}/expense/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update expense");
  return res.json();
}

export async function deleteExpense(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/expense/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete expense");
}

// ── Funds / Balance ─────────────────────────────────────────────────────────
import type { BalanceEntryResponse, BalanceSummary } from "@/types";

export async function fetchBalance(): Promise<BalanceSummary> {
  const res = await fetch(`${API_BASE}/balance`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch balance");
  return res.json();
}

export async function fetchBalanceEntries(): Promise<BalanceEntryResponse[]> {
  const res = await fetch(`${API_BASE}/balance/entries`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch balance entries");
  return res.json();
}

export async function addBalanceEntry(payload: {
  account: "cash" | "bank";
  amount: number;
  description?: string;
}): Promise<BalanceEntryResponse> {
  const res = await fetch(`${API_BASE}/balance/entry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to add balance entry");
  return res.json();
}

export async function deleteBalanceEntry(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/balance/entry/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete balance entry");
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
import type { TabResponse } from "@/types";

export async function fetchTabs(): Promise<TabResponse[]> {
  const res = await fetch(`${API_BASE}/tabs`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch tabs");
  return res.json();
}

export async function createTab(payload: {
  customer_name: string;
  amount: number;
  direction: "they_owe" | "i_owe";
  description?: string;
}): Promise<TabResponse> {
  const res = await fetch(`${API_BASE}/tab`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create tab");
  return res.json();
}

export async function settleTab(id: number): Promise<TabResponse> {
  const res = await fetch(`${API_BASE}/tab/${id}/settle`, { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to settle tab");
  return res.json();
}

export async function reopenTab(id: number): Promise<TabResponse> {
  const res = await fetch(`${API_BASE}/tab/${id}/reopen`, { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to reopen tab");
  return res.json();
}

export async function deleteTab(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/tab/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete tab");
}

// ── Inventory ────────────────────────────────────────────────────────────────
import type { InventoryResponse } from "@/types";

export async function fetchInventory(): Promise<InventoryResponse[]> {
  const res = await fetch(`${API_BASE}/inventory`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch inventory");
  return res.json();
}

export async function createInventoryItem(payload: {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  cost_per_unit?: number;
  date_purchased?: string;
  notes?: string;
  log_as_expense?: boolean;
  paid_from?: string;
}): Promise<InventoryResponse> {
  const res = await fetch(`${API_BASE}/inventory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create inventory item");
  return res.json();
}

export async function updateInventoryItem(id: number, payload: {
  name?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  cost_per_unit?: number | null;
  notes?: string;
}): Promise<InventoryResponse> {
  const res = await fetch(`${API_BASE}/inventory/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update inventory item");
  return res.json();
}

export async function deleteInventoryItem(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/inventory/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete inventory item");
}

export async function adjustInventoryItem(id: number, delta: number, restockDate?: string): Promise<InventoryResponse> {
  const res = await fetch(`${API_BASE}/inventory/${id}/adjust`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ delta, ...(restockDate ? { restock_date: restockDate } : {}) }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to adjust stock");
  }
  return res.json();
}

export async function fetchStockHistory(itemId?: number): Promise<import("@/types").StockLogEntry[]> {
  const url = itemId ? `${API_BASE}/inventory/history?item_id=${itemId}` : `${API_BASE}/inventory/history`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch stock history");
  return res.json();
}

