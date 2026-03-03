import { MenuItem, SalePayload, SaleResponse } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function fetchMenu(): Promise<MenuItem[]> {
  const res = await fetch(`${API_BASE}/menu`);
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

export async function fetchSales(): Promise<SaleResponse[]> {
  const res = await fetch(`${API_BASE}/sales`);
  if (!res.ok) throw new Error("Failed to fetch sales");
  return res.json();
}

export function exportSalesUrl(): string {
  return `${API_BASE}/sales/export`;
}

export async function resetSales(): Promise<void> {
  const res = await fetch(`${API_BASE}/sales`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to reset sales");
}
