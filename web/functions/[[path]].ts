interface Env {
  TIMEPLUS_API: Fetcher;
}

function shouldProxy(pathname: string): boolean {
  return (
    pathname.startsWith('/api/') ||
    pathname === '/healthz' ||
    pathname === '/privacy'
  );
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);

  if (!shouldProxy(url.pathname)) {
    return context.next();
  }

  // Service Binding: invoke the existing production Worker directly inside
  // Cloudflare's network. This avoids any client-side dependency on
  // *.workers.dev DNS while keeping the current Worker + D1 backend unchanged.
  return context.env.TIMEPLUS_API.fetch(context.request);
};
