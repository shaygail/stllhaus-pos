export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  is_hidden: boolean;
  is_sold_out: boolean;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface SalePayload {
  items: CartItem[];
  subtotal: number;
  discount?: number;
  payment_method: string;
  customer_name?: string;
}

export interface SaleResponse {
  id: number;
  date: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  payment_method: string;
  daily_order_number: number | null;
  customer_name: string | null;
}

export interface PreOrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface PreOrderPayload {
  customer_name: string;
  pickup_time: string;  // ISO string
  items: PreOrderItem[];
  notes?: string;
}

export interface PreOrderResponse {
  id: number;
  customer_name: string;
  pickup_time: string;
  items: PreOrderItem[];
  notes: string | null;
  status: "pending" | "ready" | "done";
  created_at: string;
}

export interface ExpenseResponse {
  id: number;
  date: string;
  amount: number;
  category: "Ingredients" | "Packaging" | "Equipment" | "Other";
  description: string;
  paid_from?: "sales" | "own" | null;
}

export interface BalanceEntryResponse {
  id: number;
  date: string;
  account: "cash" | "bank";
  amount: number;            // positive = add, negative = subtract
  description: string | null;
}

export interface BalanceSummary {
  cash: number;
  bank: number;
}

export interface TabResponse {
  id: number;
  customer_name: string;
  amount: number;
  direction: "they_owe" | "i_owe";
  description: string | null;
  date: string;
  status: "open" | "settled";
  settled_at: string | null;
}

export interface InventoryResponse {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  cost_per_unit: number | null;
  date_purchased: string;
  notes: string | null;
}

export interface StockLogEntry {
  id: number;
  date: string;
  item_id: number | null;
  item_name: string;
  category: string | null;
  action: "added" | "restocked" | "used" | "deleted";
  delta: number;
  quantity_after: number | null;
  unit: string | null;
  notes: string | null;
}