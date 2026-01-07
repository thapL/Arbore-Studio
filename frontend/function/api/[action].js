// frontend/functions/api/[action].js

const GAS_URL =
  "https://script.google.com/macros/s/AKfycbyzZFgiLAnKJ2nd1Mg7OdtXyMR27TV-C0_FDYLR9FR3wlIeIqGij_woIhCWg_psSW0q/exec";

export async function onRequest(context) {
  const { request, params } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,OPTIONS",
        "access-control-allow-headers": "content-type",
      },
    });
  }

  const action = params.action; // dates / times / styles / book ...
  const url = new URL(GAS_URL);

  url.searchParams.set("action", action);
  const incoming = new URL(request.url);
  incoming.searchParams.forEach((v, k) => url.searchParams.set(k, v));

  const isBodyMethod = !["GET", "HEAD"].includes(request.method);
  const upstream = await fetch(url.toString(), {
    method: request.method,
    headers: {
      "content-type": request.headers.get("content-type") || "application/json",
    },
    body: isBodyMethod ? await request.text() : undefined,
    redirect: "follow",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ||
        "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
    },
  });
}
