"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="stll-section-title">Something went wrong</p>
      <p className="max-w-md text-sm text-stll-muted">{error.message || "An unexpected error occurred."}</p>
      <button type="button" onClick={() => reset()} className="stll-btn-primary rounded-md px-4 py-2 text-sm font-medium">
        Try again
      </button>
    </div>
  );
}
