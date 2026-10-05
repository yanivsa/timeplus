import baseWorker from './index';
import { getSessionUser } from './auth';
import { cleanupExpiredEvidence, handleEvidenceRequest } from './evidence';
import { handleEvidenceReviewRequest } from './evidence-review';
import { ensureDailyTaskInstances } from './tasks';
import { Env } from './types';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const reviewResponse = await handleEvidenceReviewRequest(request, env);
    if (reviewResponse) return reviewResponse;

    const url = new URL(request.url);
    const evidenceResponse = await handleEvidenceRequest(request, env, ctx);
    if (evidenceResponse) {
      // The legacy submitTask() path immediately regenerates repeatable tasks.
      // Evidence submission is a separate safe path, so explicitly invoke the
      // same idempotent generator after a successful completion.
      if (
        evidenceResponse.ok &&
        request.method.toUpperCase() === 'POST' &&
        /^\/api\/child\/evidence\/[^/]+\/complete$/.test(url.pathname)
      ) {
        const user = await getSessionUser(request, env.DB);
        if (user) ctx.waitUntil(ensureDailyTaskInstances(env.DB, user.familyId).then(() => undefined));
      }
      return evidenceResponse;
    }

    return (baseWorker.fetch as any)(request, env, ctx);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    await (baseWorker.scheduled as any)(event, env, ctx);

    // The worker currently runs every minute. Evidence cleanup is intentionally
    // gated to one daily slot so R2/D1 maintenance does not run every minute.
    const scheduledAt = new Date(event.scheduledTime);
    if (scheduledAt.getUTCHours() === 3 && scheduledAt.getUTCMinutes() === 10) {
      const cleanupPromise = cleanupExpiredEvidence(env).then((result) => {
        if (result.deleted > 0) console.log(`Evidence cleanup deleted ${result.deleted} object(s)`);
      });
      ctx.waitUntil(cleanupPromise);
    }
  },
};
