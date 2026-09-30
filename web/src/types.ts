export type UserRole = 'parent' | 'child';

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  familyId: string;
  avatar?: string;
  color?: string;
}

export interface ChildSummary {
  id: string;
  name: string;
  avatar: string;
  color: string;
  available_minutes: number;
  debt_limit_minutes: number;
  level: number;
  xp: number;
  rankTitle: string;
  progressPercent: number;
  current_streak_days: number;
  best_streak_days: number;
  wallet: {
    availableMinutes: number;
    earnedToday: number;
    spentToday: number;
    earnedThisWeek: number;
    spentThisWeek: number;
    earnedThisMonth: number;
    spentThisMonth: number;
  };
  openTasksCount: number;
  pendingApprovalsCount: number;
  pendingScreenRequestsCount: number;
}

export interface TaskItem {
  id: string;
  family_id: string;
  template_id: string | null;
  child_id: string;
  title: string;
  description: string | null;
  reward_minutes: number;
  requires_photo: number;
  status: 'open' | 'submitted' | 'approved' | 'rejected' | 'expired' | 'cancelled';
  due_date: string;
  schedule_type?: 'one_time' | 'daily' | 'weekly' | 'custom' | 'repeatable';
  submitted_at: string | null;
  reviewed_at: string | null;
  submission_note?: string;
  child_name?: string;
  child_color?: string;
  child_avatar?: string;
}

export interface PendingApprovalItem extends TaskItem {
  submission_time: string;
  photo_object_key?: string;
}

export interface ScreenTimeRequestItem {
  id: string;
  family_id: string;
  child_id: string;
  requested_minutes: number;
  approved_minutes: number | null;
  source: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_at: string;
  child_name: string;
  child_color: string;
  child_avatar: string;
  available_minutes: number;
}

export interface TransactionItem {
  id: string;
  family_id: string;
  child_id: string;
  type: 'earn' | 'spend' | 'adjustment' | 'refund';
  amount: number;
  balance_after: number;
  reason: string | null;
  task_instance_id: string | null;
  screen_usage_log_id: string | null;
  created_by: string;
  created_at: string;
  child_name?: string;
  child_color?: string;
}

export interface RewardEventData {
  id: string;
  child_id: string;
  type: 'task_approved' | 'manual_bonus' | 'level_up' | 'streak_milestone';
  title: string;
  body: string;
  minutes_delta: number;
  xp_delta: number;
  level_before: number | null;
  level_after: number | null;
  streak_days: number;
}

export interface TaskTemplateItem {
  id: string;
  title: string;
  description: string | null;
  reward_minutes: number;
  schedule_type: 'one_time' | 'daily' | 'weekly' | 'custom' | 'repeatable';
  days_of_week: string | null;
  requires_photo: number;
  is_active: number;
  assigned_child_ids: string[];
}
