export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface SalePayload {
  items: CartItem[];
  subtotal: number;
  payment_method: string;
}

export interface SaleResponse {
  id: number;
  date: string;
  items: CartItem[];
  subtotal: number;
  payment_method: string;
}