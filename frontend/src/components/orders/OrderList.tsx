"use client";
import { SaleResponse } from "@/types";
import OrderCard from "./OrderCard";

interface Props {
  sales: SaleResponse[];
}

export default function OrderList({ sales }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {sales.map((sale) => (
        <OrderCard key={sale.id} sale={sale} />
      ))}
    </div>
  );
}