import baseWorker from './index';
import { cleanupExpiredEvidence, handleEvidenceRequest } from './evidence';
import { handleEvidenceReviewRequest } from './evidence-review';
import { Env } from './types';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const reviewResponse = await handleEvidenceReviewRequest(request, env);
    if (reviewResponse) return reviewResponse;

    const evidenceResponse = await handleEvidenceRequest(request, env, ctx);
    if (evidenceResponse) return evidenceResponse;

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
