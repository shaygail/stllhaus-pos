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
    <div className="w-full bg-red-700 text-white text-center text-xs font-medium tracking-wide py-2.5 px-4 flex items-center justify-center gap-2">
      <span aria-hidden>!</span>
      <span>Backend offline — start the server to record sales.</span>
    </div>
  );
}
