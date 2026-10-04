interface Env {
  TIMEPLUS_API: Fetcher;
}

const BACKEND_PATHS = ['/healthz', '/privacy'];

function shouldProxy(pathname: string): boolean {
  return pathname.startsWith('/api/') || BACKEND_PATHS.includes(pathname);
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);

  if (shouldProxy(url.pathname)) {
    return context.env.TIMEPLUS_API.fetch(context.request);
  }

  return context.next();
};
