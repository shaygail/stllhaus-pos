import { NextRequest, NextResponse } from "next/server";

/** Avoid edge caching of proxied API responses on Vercel. */
export const dynamic = "force-dynamic";

const backendBase = (process.env.BACKEND_URL || "http://localhost:8000").replace(/\/+$/, "");

function targetPath(proxy: string[] | undefined): string {
  return (proxy ?? []).filter(Boolean).join("/");
}

async function proxy(req: NextRequest, path: string, init?: RequestInit) {
  if (!path) {
    return NextResponse.json(
      { detail: "Missing API path. Use e.g. /api/menu, /api/sales (proxied to the FastAPI backend)." },
      { status: 404 }
    );
  }

  const url = `${backendBase}/${path}${req.nextUrl.search}`;
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 503 });
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const blob = await res.blob();
    return new NextResponse(blob, {
      status: res.status,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": res.headers.get("content-disposition") ?? "",
      },
    });
  }
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest, { params }: { params: { proxy?: string[] } }) {
  const res = await proxy(req, targetPath(params.proxy));
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
}

export async function POST(req: NextRequest, { params }: { params: { proxy?: string[] } }) {
  const body = await req.text();
  const res = await proxy(req, targetPath(params.proxy), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
}

export async function PUT(req: NextRequest, { params }: { params: { proxy?: string[] } }) {
  const body = await req.text();
  const res = await proxy(req, targetPath(params.proxy), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body,
  });
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
}

export async function PATCH(req: NextRequest, { params }: { params: { proxy?: string[] } }) {
  const body = await req.text();
  const res = await proxy(req, targetPath(params.proxy), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
}

export async function DELETE(req: NextRequest, { params }: { params: { proxy?: string[] } }) {
  const res = await proxy(req, targetPath(params.proxy), { method: "DELETE" });
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
}
