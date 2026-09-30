import { Env, Child } from './types';
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

export async function initializeFamily(
  db: D1Database,
  env: Env,
  payload: SetupPayload
): Promise<{ success: boolean; error?: string; sessionToken?: string }> {
  const initialized = await isSystemInitialized(db);
  if (initialized) {
    return { success: false, error: 'המערכת כבר אותחלה בעבר' };
  }

  // Validate setup secret if configured in env
  if (env.INIT_SECRET && payload.setupSecret !== env.INIT_SECRET) {
    return { success: false, error: 'קוד אתחול ראשוני שגוי' };
  }

  if (!payload.familyName || payload.familyName.trim() === '') {
    return { success: false, error: 'שם משפחה נדרש' };
  }

  if (!payload.parentPin || payload.parentPin.length < 4) {
    return { success: false, error: 'קוד הורה חייב להכיל לפחות 4 ספרות' };
  }

  if (!payload.children || payload.children.length === 0) {
    return { success: false, error: 'יש להגדיר לפחות ילד אחד' };
  }

  let pepper: string;
  try {
    pepper = requireActivePepper(env);
  } catch {
    return { success: false, error: 'השרת אינו מוגדר בצורה מאובטחת (PEPPER_SECRET חסר)' };
  }
  const familyId = env.DEFAULT_FAMILY_ID || 'yaniv_family';
  const now = new Date().toISOString();

  // 1. Parent PIN Hash
  const parentSalt = generateSalt(16);
  const parentHash = await hashPin(payload.parentPin, parentSalt, pepper);

  // Clean any old uninitialized row
  await db.prepare(`DELETE FROM families WHERE id = ?`).bind(familyId).run();

  await db
    .prepare(
      `INSERT INTO families (id, name, parent_pin_hash, parent_pin_salt, is_initialized, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)`
    )
    .bind(familyId, payload.familyName.trim(), parentHash, parentSalt, now, now)
    .run();

  // 2. Family Settings
  await db
    .prepare(
      `INSERT INTO family_settings (family_id, max_balance_minutes, daily_spend_limit_minutes, warning_debt_threshold, allow_photo_proof, sound_enabled, created_at, updated_at)
       VALUES (?, NULL, NULL, -60, 0, 1, ?, ?)`
    )
    .bind(familyId, now, now)
    .run();

  // 3. Insert Children
  const createdChildIds: string[] = [];
  for (const c of payload.children) {
    if (!c.name?.trim()) return { success: false, error: 'שם ילד נדרש' };
    if (!c.pin || c.pin.length < 4) return { success: false, error: `קוד הכניסה של ${c.name} חייב להכיל לפחות 4 ספרות` };

    const childId = generateId();
    createdChildIds.push(childId);

    const childSalt = generateSalt(16);
    const childHash = await hashPin(c.pin, childSalt, pepper);
    const color = c.color || (createdChildIds.length % 2 === 1 ? '#4facfe' : '#10b981');
    const avatar = c.avatar || (createdChildIds.length % 2 === 1 ? 'wand' : 'potion');

    await db
      .prepare(
        `INSERT INTO children (id, family_id, name, pin_hash, pin_salt, avatar, color, available_minutes, debt_limit_minutes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 30, 60, ?, ?)`
      )
      .bind(childId, familyId, c.name.trim(), childHash, childSalt, avatar, color, now, now)
      .run();

    // Starter transaction (+30 welcome bonus)
    await db
      .prepare(
        `INSERT INTO minute_transactions (id, family_id, child_id, type, amount, balance_after, reason, created_by, created_at)
         VALUES (?, ?, ?, 'earn', 30, 30, 'דקות פתיחה באקדמיית הזמן!', 'system', ?)`
      )
      .bind(generateId(), familyId, childId, now)
      .run();

    // Initialize progress
    await db
      .prepare(
        `INSERT INTO child_progress (child_id, family_id, level, xp, current_streak_days, best_streak_days, last_active_date, updated_at)
         VALUES (?, ?, 1, 0, 1, 1, ?, ?)`
      )
      .bind(childId, familyId, getIsraelDateString(), now)
      .run();
  }

  // 4. Starter Task Templates
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
  ];

  for (const tpl of starterTemplates) {
    const templateId = generateId();
    await db
      .prepare(
        `INSERT INTO task_templates (
          id, family_id, title, description, reward_minutes, schedule_type, days_of_week, 
          requires_photo, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, '[0,1,2,3,4,5,6]', 0, 1, ?, ?)`
      )
      .bind(templateId, familyId, tpl.title, tpl.description, tpl.reward, tpl.schedule, now, now)
      .run();

    // Assign to all created children
    for (const childId of createdChildIds) {
      await db
        .prepare(`INSERT INTO task_template_children (template_id, child_id) VALUES (?, ?)`)
        .bind(templateId, childId)
        .run();
    }
  }

  // Generate today's initial instances
  await ensureDailyTaskInstances(db, familyId);

  // 5. Create Parent Session
  const { token } = await createSession(db, familyId, 'parent');

  return { success: true, sessionToken: token };
}
