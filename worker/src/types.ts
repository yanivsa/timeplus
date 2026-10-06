export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ENVIRONMENT: string;
  DEFAULT_FAMILY_ID: string;
  APP_NAME: string;
  TIMEZONE: string;
  PEPPER_SECRET?: string;
  LEGACY_PEPPER_SECRET?: string;
  INIT_SECRET?: string;
  PHOTOS?: R2Bucket;
  EVIDENCE?: R2Bucket;
  EVIDENCE_KV?: KVNamespace;
  FREE_ROUTER?: Fetcher;
  TIMEPLUS_ROUTER_TOKEN?: string;
  AI_EVIDENCE_ENABLED?: string;
  AI_EVIDENCE_MODE?: string;
  AI_DIRECT_OPENROUTER_FALLBACK?: string;
  OPENROUTER_API_KEY?: string;
  EVIDENCE_IMAGE_RETENTION_DAYS?: string;
  EVIDENCE_VIDEO_RETENTION_DAYS?: string;
  WEB_VERSION?: string;
  API_VERSION?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  FCM_PROJECT_ID?: string;
  FCM_CLIENT_EMAIL?: string;
  FCM_PRIVATE_KEY?: string;
}

export type UserRole = 'parent' | 'child';

export interface AuthUser {
  id: string; // 'parent' or child_id
  name: string;
  role: UserRole;
  familyId: string;
  avatar?: string;
  color?: string;
}

export interface Family {
  id: string;
  name: string;
  parent_pin_hash: string;
  parent_pin_salt: string;
  is_initialized: number;
  created_at: string;
  updated_at: string;
}

export interface FamilySettings {
  family_id: string;
  max_balance_minutes: number | null;
  daily_spend_limit_minutes: number | null;
  warning_debt_threshold: number;
  allow_photo_proof: number;
  sound_enabled: number;
  created_at: string;
  updated_at: string;
}

export interface Child {
  id: string;
  family_id: string;
  name: string;
  pin_hash: string;
  pin_salt: string;
  avatar: string;
  color: string;
  available_minutes: number;
  debt_limit_minutes: number;
  daily_spend_limit_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  family_id: string;
  role: UserRole;
  child_id: string | null;
  expires_at: string;
  created_at: string;
}

export type ScheduleType = 'one_time' | 'daily' | 'weekly' | 'custom' | 'repeatable';

export interface TaskTemplate {
  id: string;
  family_id: string;
  title: string;
  description: string | null;
  reward_minutes: number;
  schedule_type: ScheduleType;
  days_of_week: string | null; // JSON string of number[]
  time_window_start: string | null;
  time_window_end: string | null;
  requires_photo: number;
  is_active: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  assigned_child_ids?: string[];
  task_kind?: 'mandatory' | 'bonus';
  one_time_date?: string | null;
  verification_mode?: 'manual' | 'ai_media';
  verification_rules_json?: string | null;
  allow_video_proof?: number;
  auto_approve_enabled?: number;
  max_daily_auto_awards?: number | null;
}

export type TaskStatus = 'open' | 'submitted' | 'approved' | 'rejected' | 'expired' | 'cancelled';

export interface TaskInstance {
  id: string;
  family_id: string;
  template_id: string | null;
  child_id: string;
  title: string;
  description: string | null;
  reward_minutes: number;
  requires_photo: number;
  task_kind: 'mandatory' | 'bonus';
  status: TaskStatus;
  due_date: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
  submission_note?: string;
  submission_photo_key?: string;
  child_name?: string;
  verification_mode?: 'manual' | 'ai_media';
  verification_rules_json?: string | null;
  allow_video_proof?: number;
  auto_approve_enabled?: number;
  max_daily_auto_awards?: number | null;
}

export interface TaskSubmission {
  id: string;
  task_instance_id: string;
  child_id: string;
  note: string | null;
  photo_object_key: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at: string | null;
}

export type TransactionType = 'earn' | 'spend' | 'adjustment' | 'refund';

export interface MinuteTransaction {
  id: string;
  family_id: string;
  child_id: string;
  type: TransactionType;
  amount: number;
  balance_after: number;
  reason: string | null;
  task_instance_id: string | null;
  screen_usage_log_id: string | null;
  screen_time_request_id: string | null;
  created_by: string;
  created_at: string;
}

export type ScreenTimeSource =
  | 'playstation'
  | 'vr'
  | 'tv'
  | 'computer'
  | 'tablet'
  | 'phone'
  | 'youtube'
  | 'other';

export interface ScreenTimeRequest {
  id: string;
  family_id: string;
  child_id: string;
  requested_minutes: number;
  approved_minutes: number | null;
  source: ScreenTimeSource;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  child_name?: string;
}

export interface ScreenUsageLog {
  id: string;
  family_id: string;
  child_id: string;
  screen_time_request_id: string | null;
  source: ScreenTimeSource;
  minutes: number;
  reason: string | null;
  created_by: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  family_id: string;
  recipient_role: UserRole;
  recipient_child_id: string | null;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  family_id: string;
  actor_type: 'parent' | 'child' | 'system';
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata_json: string;
  created_at: string;
}

export interface ChildProgress {
  child_id: string;
  family_id: string;
  level: number;
  xp: number;
  current_streak_days: number;
  best_streak_days: number;
  last_active_date: string | null;
  updated_at: string;
}

export interface RewardEvent {
  id: string;
  family_id: string;
  child_id: string;
  type: 'task_approved' | 'manual_bonus' | 'level_up' | 'streak_milestone';
  title: string;
  body: string;
  minutes_delta: number;
  xp_delta: number;
  level_before: number | null;
  level_after: number | null;
  streak_days: number;
  task_instance_id: string | null;
  seen_at: string | null;
  created_at: string;
}
