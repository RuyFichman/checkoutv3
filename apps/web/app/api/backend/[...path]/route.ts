const API_URL = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3333/v1';
const ALLOWED_PREFIXES = [
  'auth/',
  'account/',
  'dashboard/',
  'products/',
  'themes/',
  'orders/',
  'gateways/',
  'public/checkout/',
  'public/checkout-sessions/',
];
const ALLOWED_EXACT_PATHS = ['products', 'themes', 'orders', 'gateways'];

type RouteParameters = {
  params: Promise<{ path: string[] }>;
};

function isAllowed(path: string) {
  return (
    ALLOWED_EXACT_PATHS.includes(path) || ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix))
  );
}

async function proxy(request: Request, context: RouteParameters) {
  const { path: segments } = await context.params;
  const path = segments.join('/');

  if (!isAllowed(path)) {
    return Response.json({ message: 'Rota não permitida.' }, { status: 404 });
  }

  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(`${API_URL}/${path}`);
  targetUrl.search = incomingUrl.search;

  const headers = new Headers({
    accept: 'application/json',
  });
  const contentType = request.headers.get('content-type');
  const cookie = request.headers.get('cookie');

  if (contentType) {
    headers.set('content-type', contentType);
  }

  if (cookie) {
    headers.set('cookie', cookie);
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
      cache: 'no-store',
      redirect: 'manual',
    });
    const responseHeaders = new Headers();
    const upstreamContentType = upstream.headers.get('content-type');
    const setCookie = upstream.headers.get('set-cookie');

    if (upstreamContentType) {
      responseHeaders.set('content-type', upstreamContentType);
    }

    if (setCookie) {
      responseHeaders.set('set-cookie', setCookie);
    }

    return new Response(upstream.status === 204 ? null : await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { message: 'O serviço de acesso está temporariamente indisponível.' },
      { status: 503 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
