import { NextResponse } from "next/server";

/**
 * Next 14 dev requires `.next/server/middleware-manifest.json` before rendering
 * any App Router page. If the matcher only matched `/`, that file was not created
 * until someone hit `/` first — a cold open or refresh on `/analytics` then crashed
 * (500 / broken navigation that can look like 404).
 *
 * This matcher runs on all normal routes (including `/api/*`) but skips static
 * assets and the image optimizer. Handler is still a no-op.
 */
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
    "/",
  ],
};
