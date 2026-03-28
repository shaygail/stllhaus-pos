import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="stll-section-title">Page not found</p>
      <p className="max-w-md text-sm text-stll-muted">That URL does not exist in this app.</p>
      <Link
        href="/"
        className="stll-btn-primary inline-flex rounded-md px-4 py-2 text-sm font-medium"
      >
        Back to POS
      </Link>
    </div>
  );
}
