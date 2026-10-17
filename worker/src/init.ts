import { Env } from './types';
import { generateId, generateSalt, hashPin } from './crypto';
import { requireActivePepper } from './pin-security';
import { createSession } from './auth';
import { ensureDailyTaskInstances } from './tasks';
import { getIsraelDateString } from './timezone';

export interface SetupChildPayload {
  name: string;
  pin: string;
  avatar?: string;
  color?: string;
}

export interface SetupPayload {
  familyName: string;
  parentPin: string;
  children: SetupChildPayload[];
  setupSecret?: string;
}

const PIN_PATTERN = /^\d{4,8}$/;
const SETUP_LEASE_MS = 5 * 60 * 1000;

const starterTemplates = [
  {
    title: 'סידור החדר והמיטה',
    description: 'קיפול שמיכה, איסוף בגדים מהרצפה וארגון השולחן',
    reward: 15,
    schedule: 'daily',
  },
  {
    title: 'קריאת ספר (20 דקות)',
    description: 'קריאה עצמאית בספר אהוב',
    reward: 20,
    schedule: 'daily',
  },
  {
    title: 'עזרה בעריכת או פינוי שולחן',
    description: 'עזרה למשפחה בארוחה',
    reward: 10,
    schedule: 'daily',
  },
  {
    title: 'הכנת שיעורי בית / תרגול',
    description: 'סיום כל המשימות לבית הספר',
    reward: 20,
    schedule: 'daily',
  },
] as const;

export async function isSystemInitialized(db: D1Database): Promise<boolean> {
  const family = await db
    .prepare(`SELECT is_initialized FROM families LIMIT 1`)
    .first<{ is_initialized: number }>();
  return family ? family.is_initialized === 1 : false;
}

export async function getPublicChildrenList(
  db: D1Database
): Promise<{ id: string; name: string; avatar: string; color: string }[]> {
  const { results } = await db
    .prepare(`SELECT id, name, avatar, color FROM children ORDER BY created_at ASC`)
    .all<{ id: string; name: string; avatar: string; color: string }>();
  return results || [];
}

function validateSetupPayload(env: Env, payload: SetupPayload): string | null {
  const allowInsecureInit = env.ENVIRONMENT !== 'production' && env.ALLOW_INSECURE_INIT === 'true';
  if (!env.INIT_SECRET && !allowInsecureInit) {
    return 'השרת אינו מוגדר בצורה מאובטחת (INIT_SECRET חסר)';
  }
  if (env.INIT_SECRET && payload.setupSecret !== env.INIT_SECRET) {
    return 'קוד אתחול ראשוני שגוי';
  }
  if (!payload.familyName || payload.familyName.trim() === '') {
    return 'שם משפחה נדרש';
  }
  if (!PIN_PATTERN.test(payload.parentPin || '')) {
    return 'קוד הורה חייב להכיל 4 עד 8 ספרות';
  }
  if (!payload.children || payload.children.length === 0) {
    return 'יש להגדיר לפחות ילד אחד';
  }
  for (const child of payload.children) {
    if (!child.name?.trim()) return 'שם ילד נדרש';
    if (!PIN_PATTERN.test(child.pin || '')) {
      return `קוד הכניסה של ${child.name} חייב להכיל 4 עד 8 ספרות`;
    }
  }
  return null;
}

export async function initializeFamily(
  db: D1Database,
  env: Env,
  payload: SetupPayload
): Promise<{ success: boolean; error?: string; sessionToken?: string }> {
  const initialized = await isSystemInitialized(db);
  if (initialized) {
    return { success: false, error: 'המערכת כבר אותחלה בעבר' };
  }

  const validationError = validateSetupPayload(env, payload);
  if (validationError) return { success: false, error: validationError };

  let pepper: string;
  try {
    pepper = requireActivePepper(env);
  } catch {
    return { success: false, error: 'השרת אינו מוגדר בצורה מאובטחת (PEPPER_SECRET חסר)' };
  }

  const familyId = env.DEFAULT_FAMILY_ID || 'yaniv_family';
  const now = new Date().toISOString();
  const parentSalt = generateSalt(16);
  const parentHash = await hashPin(payload.parentPin, parentSalt, pepper);

  // Precompute every child record before the first DB mutation. A malformed
  // child can therefore never leave a partially initialized family behind.
  const childRecords = [];
  for (const [index, child] of payload.children.entries()) {
    const childSalt = generateSalt(16);
    childRecords.push({
      id: generateId(),
      name: child.name.trim(),
      pinHash: await hashPin(child.pin, childSalt, pepper),
      pinSalt: childSalt,
      color: child.color || (index % 2 === 0 ? '#4facfe' : '#10b981'),
      avatar: child.avatar || (index % 2 === 0 ? 'wand' : 'potion'),
    });
  }

  const templateRecords = starterTemplates.map((template) => ({
    ...template,
    id: generateId(),
  }));

  // Treat a recent uninitialized family row as an active setup lease. Only a
  // stale lease may be cleaned up, and the delete uses the exact timestamp we
  // observed so two recovery attempts cannot delete each other's work.
  const existingSetup = await db
    .prepare(`SELECT is_initialized, updated_at FROM families WHERE id = ?`)
    .bind(familyId)
    .first<{ is_initialized: number; updated_at: string }>();

  if (existingSetup?.is_initialized === 1) {
    return { success: false, error: 'המערכת כבר אותחלה בעבר' };
  }

  if (existingSetup) {
    const updatedAtMs = Date.parse(existingSetup.updated_at);
    const leaseIsActive = Number.isFinite(updatedAtMs) && Date.now() - updatedAtMs < SETUP_LEASE_MS;
    if (leaseIsActive) {
      return { success: false, error: 'אתחול המשפחה כבר מתבצע' };
    }

    const cleanup = await db
      .prepare(`DELETE FROM families WHERE id = ? AND is_initialized = 0 AND updated_at = ?`)
      .bind(familyId, existingSetup.updated_at)
      .run();
    if (Number(cleanup.meta.changes || 0) !== 1) {
      return { success: false, error: 'אתחול המשפחה כבר מתבצע' };
    }
  }

  const setupStatements: D1PreparedStatement[] = [
    db.prepare(
      `INSERT INTO families (id, name, parent_pin_hash, parent_pin_salt, is_initialized, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?)`
    ).bind(familyId, payload.familyName.trim(), parentHash, parentSalt, now, now),
    db.prepare(
      `INSERT INTO family_settings (family_id, max_balance_minutes, daily_spend_limit_minutes, warning_debt_threshold, allow_photo_proof, sound_enabled, created_at, updated_at)
       VALUES (?, NULL, NULL, -60, 0, 1, ?, ?)`
    ).bind(familyId, now, now),
  ];

  for (const child of childRecords) {
    setupStatements.push(
      db.prepare(
        `INSERT INTO children (id, family_id, name, pin_hash, pin_salt, avatar, color, available_minutes, debt_limit_minutes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 30, 60, ?, ?)`
      ).bind(child.id, familyId, child.name, child.pinHash, child.pinSalt, child.avatar, child.color, now, now),
      db.prepare(
        `INSERT INTO minute_transactions (id, family_id, child_id, type, amount, balance_after, reason, created_by, created_at)
         VALUES (?, ?, ?, 'earn', 30, 30, 'דקות פתיחה באקדמיית הזמן!', 'system', ?)`
      ).bind(generateId(), familyId, child.id, now),
      db.prepare(
        `INSERT INTO child_progress (child_id, family_id, level, xp, current_streak_days, best_streak_days, last_active_date, updated_at)
         VALUES (?, ?, 1, 0, 1, 1, ?, ?)`
      ).bind(child.id, familyId, getIsraelDateString(), now)
    );
  }

  for (const template of templateRecords) {
    setupStatements.push(
      db.prepare(
        `INSERT INTO task_templates (
          id, family_id, title, description, reward_minutes, schedule_type, days_of_week,
          requires_photo, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, '[0,1,2,3,4,5,6]', 0, 1, ?, ?)`
      ).bind(template.id, familyId, template.title, template.description, template.reward, template.schedule, now, now)
    );
    for (const child of childRecords) {
      setupStatements.push(
        db.prepare(`INSERT INTO task_template_children (template_id, child_id) VALUES (?, ?)`)
          .bind(template.id, child.id)
      );
    }
  }

  // D1 batches are transactional: either the setup core is durable as a whole,
  // or none of it is. The family intentionally remains is_initialized=0.
  try {
    await db.batch(setupStatements);
  } catch (error) {
    const competingSetup = await db
      .prepare(`SELECT is_initialized, updated_at FROM families WHERE id = ?`)
      .bind(familyId)
      .first<{ is_initialized: number; updated_at: string }>();
    if (competingSetup) {
      return {
        success: false,
        error: competingSetup.is_initialized === 1 ? 'המערכת כבר אותחלה בעבר' : 'אתחול המשפחה כבר מתבצע',
      };
    }
    throw error;
  }

  await ensureDailyTaskInstances(db, familyId);
  const { token } = await createSession(db, familyId, 'parent');

  const finalized = await db.prepare(
    `UPDATE families SET is_initialized = 1, updated_at = ?
     WHERE id = ? AND is_initialized = 0`
  ).bind(new Date().toISOString(), familyId).run();

  if (finalized.meta.changes !== 1) {
    return { success: false, error: 'לא ניתן היה להשלים את אתחול המשפחה' };
  }

  return { success: true, sessionToken: token };
}
