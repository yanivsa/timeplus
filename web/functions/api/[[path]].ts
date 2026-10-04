interface Env {
  TIMEPLUS_API: Fetcher;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  return env.TIMEPLUS_API.fetch(request);
};
