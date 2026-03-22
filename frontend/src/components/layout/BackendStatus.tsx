"use client";
import { useEffect, useState } from "react";

export default function BackendStatus() {
  const [status, setStatus] = useState<"ok" | "down" | "unknown">("unknown");

  const check = async () => {
    try {
      const res = await fetch("/api/menu", { cache: "no-store" });
      setStatus(res.ok ? "ok" : "down");
    } catch {
      setStatus("down");
    }
  };

  useEffect(() => {
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  if (status === "ok" || status === "unknown") return null;

  return (
    <div className="w-full bg-red-600 text-white text-center text-sm font-semibold py-2 px-4 flex items-center justify-center gap-2">
      <span>⚠</span>
      <span>Backend offline — sales cannot be recorded. Start the backend server to continue.</span>
    </div>
  );
}
