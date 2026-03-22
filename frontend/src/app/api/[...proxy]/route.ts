import { NextRequest, NextResponse } from "next/server";

const BACKEND = "http://localhost:8000";

async function proxy(req: NextRequest, path: string, init?: RequestInit) {
  const url = `${BACKEND}/${path}${req.nextUrl.search}`;
  const res = await fetch(url, init);

  const contentType = res.headers.get("content-type") ?? "";
  // Stream binary responses (e.g. Excel export) directly
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

export async function GET(
  req: NextRequest,
  { params }: { params: { proxy: string[] } }
) {
  return proxy(req, params.proxy.join("/"));
}

export async function POST(
  req: NextRequest,
  { params }: { params: { proxy: string[] } }
) {
  const body = await req.text();
  return proxy(req, params.proxy.join("/"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { proxy: string[] } }
) {
  const body = await req.text();
  return proxy(req, params.proxy.join("/"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { proxy: string[] } }
) {
  const body = await req.text();
  return proxy(req, params.proxy.join("/"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { proxy: string[] } }
) {
  return proxy(req, params.proxy.join("/"), { method: "DELETE" });
}
