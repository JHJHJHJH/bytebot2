import { NextRequest } from "next/server";
import { getDesktopBaseUrl } from "../../../../lib/backendUrls";

async function proxy(req: NextRequest, path: string[]): Promise<Response> {
  const baseUrl = getDesktopBaseUrl();
  const subPath = path.length ? path.join("/") : "";
  const url = `${baseUrl}/${subPath}${req.nextUrl.search}`;
  const requestBody =
    req.method === "GET" || req.method === "HEAD"
      ? undefined
      : await req.text();

  const res = await fetch(url, {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
    },
    body: requestBody || undefined,
  });

  return new Response(await res.text(), {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "application/json",
    },
  });
}

type PathParams = Promise<{ path?: string[] }>;

async function handler(req: NextRequest, { params }: { params: PathParams }) {
  const { path } = await params;
  return proxy(req, path ?? []);
}

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
