import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { audio } from '../services/audio';
import {
  ChildSummary,
  PendingApprovalItem,
  ScreenTimeRequestItem,
  TaskTemplateItem,
  TransactionItem,
} from '../types';
import {
  Shield,
  CheckCircle,
  XCircle,
  PlusCircle,
  MinusCircle,
  Clock,
  Tv,
  ListTodo,
  BarChart3,
  Settings,
  History,
  LogOut,
  RefreshCw,
  Plus,
  Flame,
  AlertTriangle,
  Sparkles,
  Edit2,
  Trash2,
  X,
  Volume2,
  VolumeX,
  UserPlus,
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  User,
} from 'lucide-react';
import { NotificationBell } from '../components/NotificationBell';

export const ParentDashboard: React.FC = () => {
  const { user, logout, familyName } = useAuth();
  const weekDays = [
    { id: 0, label: 'א׳' },
    { id: 1, label: 'ב׳' },
    { id: 2, label: 'ג׳' },
    { id: 3, label: 'ד׳' },
    { id: 4, label: 'ה׳' },
    { id: 5, label: 'ו׳' },
    { id: 6, label: 'ש׳' },
  ];
  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'tasks' | 'usage' | 'history' | 'stats' | 'settings'>('overview');
  const [loading, setLoading] = useState(true);

  // Data
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [activeScreenSessions, setActiveScreenSessions] = useState<any[]>([]);
  const [pendingTasks, setPendingTasks] = useState<PendingApprovalItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ScreenTimeRequestItem[]>([]);
  const [templates, setTemplates] = useState<TaskTemplateItem[]>([]);
  const [history, setHistory] = useState<TransactionItem[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [settingsData, setSettingsData] = useState<any>(null);

  // Action status message
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Modals state
  const [adjustModalChild, setAdjustModalChild] = useState<ChildSummary | null>(null);
  const [adjustMinutesDelta, setAdjustMinutesDelta] = useState<number>(15);
  const [adjustReason, setAdjustReason] = useState('');

  const [usageModalChild, setUsageModalChild] = useState<ChildSummary | null>(null);
  const [usageMinutes, setUsageMinutes] = useState<number>(30);
  const [usageSource, setUsageSource] = useState('playstation');
  const [usageReason, setUsageReason] = useState('');

  const [customApprovalTask, setCustomApprovalTask] = useState<PendingApprovalItem | null>(null);
  const [customApprovalMinutes, setCustomApprovalMinutes] = useState<number>(15);

  const [newTemplateModal, setNewTemplateModal] = useState(false);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateReward, setTemplateReward] = useState<number>(15);
  const [templateSchedule, setTemplateSchedule] = useState<'daily' | 'weekly' | 'custom' | 'repeatable' | 'one_time'>('daily');
  const [templateKind, setTemplateKind] = useState<'bonus' | 'mandatory'>('bonus');
  const [templateDays, setTemplateDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [templateOneTimeDate, setTemplateOneTimeDate] = useState('');
  const [templateTimeStart, setTemplateTimeStart] = useState('');
  const [templateTimeEnd, setTemplateTimeEnd] = useState('');
  const [templateChildIds, setTemplateChildIds] = useState<string[]>([]);
  const [templateAiEnabled, setTemplateAiEnabled] = useState(false);
  const [templateAllowVideo, setTemplateAllowVideo] = useState(false);
  const [templateAutoApprove, setTemplateAutoApprove] = useState(false);
  const [templateAiInstructions, setTemplateAiInstructions] = useState('');

  // Edit template state
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplateItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editReward, setEditReward] = useState<number>(15);
  const [editSchedule, setEditSchedule] = useState<'daily' | 'weekly' | 'custom' | 'repeatable' | 'one_time'>('daily');
  const [editKind, setEditKind] = useState<'bonus' | 'mandatory'>('bonus');
  const [editDays, setEditDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [editOneTimeDate, setEditOneTimeDate] = useState('');
  const [editTimeStart, setEditTimeStart] = useState('');
  const [editTimeEnd, setEditTimeEnd] = useState('');
  const [editChildIds, setEditChildIds] = useState<string[]>([]);
  const [editAiEnabled, setEditAiEnabled] = useState(false);
  const [editAllowVideo, setEditAllowVideo] = useState(false);
  const [editAutoApprove, setEditAutoApprove] = useState(false);
  const [editAiInstructions, setEditAiInstructions] = useState('');

  const [addChildModal, setAddChildModal] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildPin, setNewChildPin] = useState('');
  const [newChildColor, setNewChildColor] = useState('#38bdf8');

  // Child details modal state
  const [selectedChildDetails, setSelectedChildDetails] = useState<any | null>(null);
  const [childDetailsLoading, setChildDetailsLoading] = useState(false);
  const [childDetailsTab, setChildDetailsTab] = useState<'transactions' | 'tasks' | 'requests'>('transactions');

  // Load parent data
  const loadDashboard = async () => {
    try {
      const res = await apiRequest('/api/parent/dashboard');
      setChildren(res.children || []);
      setActiveScreenSessions(res.activeScreenSessions || []);

      const approvalsRes = await apiRequest('/api/parent/approvals');
      setPendingTasks(approvalsRes.pendingTasks || []);
      setPendingRequests(approvalsRes.pendingRequests || []);
    } catch (e) {
      console.error('Failed to load parent dashboard', e);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await apiRequest('/api/parent/tasks/templates');
      setTemplates(res.templates || []);
    } catch (e) {
      console.error('Failed to load templates', e);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await apiRequest('/api/parent/history?limit=60');
      setHistory(res.transactions || []);
    } catch (e) {
      console.error('Failed to load history', e);
    }
  };

  const loadStats = async () => {
    try {
      const res = await apiRequest('/api/parent/stats');
      setStats(res.stats || []);
    } catch (e) {
      console.error('Failed to load stats', e);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await apiRequest('/api/parent/settings');
      setSettingsData(res.settings);
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  };

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'tasks') loadTemplates();
    if (activeTab === 'history') loadHistory();
    if (activeTab === 'stats') loadStats();
    if (activeTab === 'settings') loadSettings();
  }, [activeTab]);

  // Approvals actions
  const handleApproveTask = async (instanceId: string, customReward?: number) => {
    audio.playTap();
    try {
      const res = await apiRequest(`/api/parent/tasks/${instanceId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ rewardMinutes: customReward }),
      });
      audio.playApproval();
      setStatusMessage({ text: res.message || 'המשימה אושרה בהצלחה!', type: 'success' });
      setCustomApprovalTask(null);
      await loadDashboard();
    } catch (err: any) {
      audio.playReject();
      setStatusMessage({ text: err.message || 'אישור נכשל', type: 'error' });
    }
  };

  const handleRejectTask = async (instanceId: string) => {
    audio.playTap();
    try {
      const res = await apiRequest(`/api/parent/tasks/${instanceId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'לא הושלם במלואו' }),
      });
      audio.playReject();
      setStatusMessage({ text: res.message || 'המשימה נדחתה', type: 'success' });
      await loadDashboard();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'דחייה נכשלה', type: 'error' });
    }
  };

  const handleReviewScreenTime = async (requestId: string, approved: boolean, customMinutes?: number) => {
    audio.playTap();
    try {
      const res = await apiRequest(`/api/parent/screen-time/${requestId}/review`, {
        method: 'POST',
        body: JSON.stringify({ approved, customMinutes }),
      });
      if (approved) audio.playApproval();
      else audio.playReject();
      setStatusMessage({ text: res.message || 'הבקשה עודכנה', type: 'success' });
      await loadDashboard();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'שגיאה בטיפול בבקשה', type: 'error' });
    }
  };

  // Minute adjustments
  const handleAdjustMinutes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalChild) return;
    audio.playTap();

    try {
      const res = await apiRequest('/api/parent/minutes/adjust', {
        method: 'POST',
        body: JSON.stringify({
          childId: adjustModalChild.id,
          minutesDelta: adjustMinutesDelta,
          reason: adjustReason.trim(),
        }),
      });
      audio.playApproval();
      setAdjustModalChild(null);
      setAdjustReason('');
      setStatusMessage({
        text: res.warning ? `${res.message} (${res.warning})` : res.message,
        type: res.warning ? 'warning' : 'success',
      });
      await loadDashboard();
    } catch (err: any) {
      audio.playReject();
      setStatusMessage({ text: err.message || 'עדכון דקות נכשל', type: 'error' });
    }
  };

  // Manual Usage logging
  const handleLogUsage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usageModalChild) return;
    audio.playTap();

    try {
      const res = await apiRequest('/api/parent/usage/log', {
        method: 'POST',
        body: JSON.stringify({
          childId: usageModalChild.id,
          minutes: usageMinutes,
          source: usageSource,
          reason: usageReason.trim() || null,
        }),
      });
      audio.playApproval();
      setUsageModalChild(null);
      setUsageReason('');
      setStatusMessage({
        text: res.warning ? `${res.message} (${res.warning})` : res.message,
        type: res.warning ? 'warning' : 'success',
      });
      await loadDashboard();
    } catch (err: any) {
      audio.playReject();
      setStatusMessage({ text: err.message || 'רישום ניצול נכשל', type: 'error' });
    }
  };

  // Usage correction / refund
  const handleCorrectUsage = async (tx: TransactionItem) => {
    if (!tx.screen_usage_log_id) return;
    const reason = prompt('סיבת התיקון / זיכוי: (למשל: טעות ברישום)');
    if (!reason) return;

    audio.playTap();
    try {
      const res = await apiRequest(`/api/parent/usage/${tx.screen_usage_log_id}/correct`, {
        method: 'POST',
        body: JSON.stringify({ correctionReason: reason }),
      });
      audio.playApproval();
      setStatusMessage({ text: res.message, type: 'success' });
      await loadDashboard();
      await loadHistory();
    } catch (err: any) {
      audio.playReject();
      setStatusMessage({ text: err.message || 'תיקון נכשל', type: 'error' });
    }
  };

  const parseTemplateDays = (value: string | null | undefined): number[] => {
    try {
      const parsed = value ? JSON.parse(value) : [];
      return Array.isArray(parsed) ? parsed.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : [];
    } catch {
      return [];
    }
  };

  const toggleDay = (day: number, current: number[], setter: React.Dispatch<React.SetStateAction<number[]>>) => {
    setter(current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort());
  };

  // Create Template
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    audio.playTap();

    try {
      await apiRequest('/api/parent/tasks/templates', {
        method: 'POST',
        body: JSON.stringify({
          title: templateTitle.trim(),
          description: templateDescription.trim() || null,
          rewardMinutes: templateReward,
          scheduleType: templateSchedule,
          taskKind: templateKind,
          daysOfWeek: templateDays,
          oneTimeDate: templateOneTimeDate || null,
          timeWindowStart: templateTimeStart || null,
          timeWindowEnd: templateTimeEnd || null,
          assignedChildIds: templateChildIds.length > 0 ? templateChildIds : children.map((c) => c.id),
          verificationMode: templateAiEnabled ? 'ai_media' : 'manual',
          verificationRules: templateAiEnabled ? {
            activityType: templateAutoApprove ? 'educational_result_screenshot' : 'general_visual_evidence',
            requiredChecks: templateAutoApprove ? ['correct_activity','completion_visible','result_readable','screen_ui_visible'] : ['correct_activity','completion_visible'],
            requireScreenUi: templateAutoApprove,
            instructions: templateAiInstructions.trim() || undefined,
          } : {},
          allowVideoProof: templateAiEnabled && templateAllowVideo,
          autoApproveEnabled: templateAiEnabled && templateAutoApprove,
          maxDailyAutoAwards: templateAiEnabled && templateAutoApprove ? 3 : null,
        }),
      });
      audio.playApproval();
      setNewTemplateModal(false);
      setTemplateTitle('');
      setTemplateDescription('');
      setTemplateReward(15);
      setTemplateSchedule('daily');
      setTemplateKind('bonus');
      setTemplateDays([0, 1, 2, 3, 4]);
      setTemplateOneTimeDate('');
      setTemplateTimeStart('');
      setTemplateTimeEnd('');
      setTemplateChildIds([]);
      setTemplateAiEnabled(false); setTemplateAllowVideo(false); setTemplateAutoApprove(false); setTemplateAiInstructions('');
      setStatusMessage({ text: 'תבנית המשימה נוצרה בהצלחה!', type: 'success' });
      await loadTemplates();
      await loadDashboard();
    } catch (err: any) {
      audio.playReject();
      setStatusMessage({ text: err.message || 'יצירת תבנית נכשלה', type: 'error' });
    }
  };

  // Archive Template
  const handleArchiveTemplate = async (id: string) => {
    if (!confirm('האם להעביר משימה זו לארכיון?')) return;
    audio.playTap();
    try {
      await apiRequest(`/api/parent/tasks/templates/${id}`, { method: 'DELETE' });
      setStatusMessage({ text: 'המשימה הועברה לארכיון', type: 'success' });
      await loadTemplates();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'פעולה נכשלה', type: 'error' });
    }
  };

  // Open Edit Template Modal
  const openEditTemplate = (tpl: TaskTemplateItem) => {
    audio.playTap();
    setEditingTemplate(tpl);
    setEditTitle(tpl.title);
    setEditDescription(tpl.description || '');
    setEditReward(tpl.reward_minutes);
    setEditSchedule((tpl.schedule_type as any) || 'daily');
    setEditKind(tpl.task_kind === 'mandatory' ? 'mandatory' : 'bonus');
    const parsedDays = parseTemplateDays(tpl.days_of_week);
    setEditDays(parsedDays.length > 0 ? parsedDays : [0, 1, 2, 3, 4]);
    setEditOneTimeDate(tpl.one_time_date || '');
    setEditTimeStart(tpl.time_window_start || '');
    setEditTimeEnd(tpl.time_window_end || '');
    setEditChildIds(tpl.assigned_child_ids && tpl.assigned_child_ids.length > 0 ? tpl.assigned_child_ids : children.map((c) => c.id));
    setEditAiEnabled(tpl.verification_mode === 'ai_media');
    setEditAllowVideo(Number(tpl.allow_video_proof || 0) === 1);
    setEditAutoApprove(Number(tpl.auto_approve_enabled || 0) === 1);
    try { const rules = tpl.verification_rules_json ? JSON.parse(tpl.verification_rules_json) : {}; setEditAiInstructions(typeof rules?.instructions === 'string' ? rules.instructions : ''); } catch { setEditAiInstructions(''); }
  };

  // Update Template
  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;
    audio.playTap();

    try {
      const res = await apiRequest(`/api/parent/tasks/templates/${editingTemplate.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          rewardMinutes: editReward,
          scheduleType: editSchedule,
          taskKind: editKind,
          daysOfWeek: editDays,
          oneTimeDate: editOneTimeDate || null,
          timeWindowStart: editTimeStart || null,
          timeWindowEnd: editTimeEnd || null,
          assignedChildIds: editChildIds.length > 0 ? editChildIds : children.map((c) => c.id),
          verificationMode: editAiEnabled ? 'ai_media' : 'manual',
          verificationRules: editAiEnabled ? {
            activityType: editAutoApprove ? 'educational_result_screenshot' : 'general_visual_evidence',
            requiredChecks: editAutoApprove ? ['correct_activity','completion_visible','result_readable','screen_ui_visible'] : ['correct_activity','completion_visible'],
            requireScreenUi: editAutoApprove,
            instructions: editAiInstructions.trim() || undefined,
          } : {},
          allowVideoProof: editAiEnabled && editAllowVideo,
          autoApproveEnabled: editAiEnabled && editAutoApprove,
          maxDailyAutoAwards: editAiEnabled && editAutoApprove ? 3 : null,
        }),
      });
      audio.playApproval();
      setEditingTemplate(null);
      setStatusMessage({ text: res.message || 'תבנית המשימה עודכנה בהצלחה!', type: 'success' });
      await loadTemplates();
      await loadDashboard();
    } catch (err: any) {
      audio.playReject();
      setStatusMessage({ text: err.message || 'עדכון תבנית נכשל', type: 'error' });
    }
  };

  const handleApproveAll = async () => {
    if (pendingTasks.length === 0) return;
    audio.playTap();
    try {
      const res = await apiRequest('/api/parent/tasks/approve-all', { method: 'POST' });
      audio.playApproval();
      setStatusMessage({ text: res.message || 'כל המשימות אושרו', type: 'success' });
      await loadDashboard();
    } catch (err: any) {
      audio.playReject();
      setStatusMessage({ text: err.message || 'אישור מרוכז נכשל', type: 'error' });
    }
  };

  const handleDuplicateTemplate = async (tpl: TaskTemplateItem) => {
    audio.playTap();
    try {
      await apiRequest('/api/parent/tasks/templates', {
        method: 'POST',
        body: JSON.stringify({
          title: `${tpl.title} (עותק)`,
          description: tpl.description,
          rewardMinutes: tpl.reward_minutes,
          scheduleType: tpl.schedule_type,
          taskKind: tpl.task_kind || 'bonus',
          daysOfWeek: parseTemplateDays(tpl.days_of_week),
          oneTimeDate: tpl.one_time_date || null,
          timeWindowStart: tpl.time_window_start || null,
          timeWindowEnd: tpl.time_window_end || null,
          assignedChildIds: tpl.assigned_child_ids || [],
        }),
      });
      audio.playApproval();
      setStatusMessage({ text: 'נוצר עותק של המשימה', type: 'success' });
      await loadTemplates();
      await loadDashboard();
    } catch (err: any) {
      audio.playReject();
      setStatusMessage({ text: err.message || 'שכפול המשימה נכשל', type: 'error' });
    }
  };

  // Add child
  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    audio.playTap();

    if (newChildPin.length < 4) {
      setStatusMessage({ text: 'קוד הילד חייב להכיל לפחות 4 ספרות', type: 'error' });
      return;
    }

    try {
      await apiRequest('/api/parent/children', {
        method: 'POST',
        body: JSON.stringify({
          name: newChildName.trim(),
          pin: newChildPin,
          color: newChildColor,
        }),
      });
      audio.playApproval();
      setAddChildModal(false);
      setNewChildName('');
      setNewChildPin('');
      setStatusMessage({ text: 'הילד נוסף בהצלחה למשפחה!', type: 'success' });
      await loadDashboard();
    } catch (err: any) {
      audio.playReject();
      setStatusMessage({ text: err.message || 'הוספת ילד נכשלה', type: 'error' });
    }
  };

  const openChildDetails = async (child: ChildSummary) => {
    audio.playTap();
    setSelectedChildDetails({
      child,
      wallet: child.wallet,
      transactions: [],
      tasks: [],
      screenRequests: [],
      loading: true,
    });
    setChildDetailsLoading(true);
    setChildDetailsTab('transactions');

    try {
      const res = await apiRequest(`/api/parent/children/${child.id}/details`);
      setSelectedChildDetails({
        child: res.child || child,
        wallet: res.wallet || child.wallet,
        transactions: res.transactions || [],
        tasks: res.tasks || [],
        screenRequests: res.screenRequests || [],
        loading: false,
      });
    } catch (err) {
      console.error('Failed to load child details', err);
      setSelectedChildDetails((prev: any) => (prev ? { ...prev, loading: false } : null));
    } finally {
      setChildDetailsLoading(false);
    }
  };

  const totalPending = pendingTasks.length + pendingRequests.length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* 1. TOP BAR */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-500/20">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-gold-400 p-0.5 shadow-lg shadow-gold-500/20">
            <div className="h-full w-full rounded-2xl bg-night-950 flex items-center justify-center">
              <Shield className="h-6 w-6 text-gold-400" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black text-gold-300 font-cinzel">חדר המנהלים · Time+</h1>
            <p className="text-xs text-purple-300/80 font-alef">{familyName}</p>
          </div>
        </div>

        {/* Global Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-gold-500 text-night-950 shadow-md'
                : 'bg-night-900 text-purple-200 hover:bg-night-850'
            }`}
          >
            <span>סקירה</span>
          </button>

          <button
            onClick={() => setActiveTab('approvals')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'approvals'
                ? 'bg-gold-500 text-night-950 shadow-md'
                : 'bg-night-900 text-purple-200 hover:bg-night-850'
            }`}
          >
            <span>אישורים</span>
            {totalPending > 0 && (
              <span className="h-5 w-5 rounded-full bg-red-500 text-white font-mono text-[10px] flex items-center justify-center">
                {totalPending}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'tasks'
                ? 'bg-gold-500 text-night-950 shadow-md'
                : 'bg-night-900 text-purple-200 hover:bg-night-850'
            }`}
          >
            <span>משימות</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-gold-500 text-night-950 shadow-md'
                : 'bg-night-900 text-purple-200 hover:bg-night-850'
            }`}
          >
            <span>היסטוריה</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'stats'
                ? 'bg-gold-500 text-night-950 shadow-md'
                : 'bg-night-900 text-purple-200 hover:bg-night-850'
            }`}
          >
            <span>סטטיסטיקה</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-gold-500 text-night-950 shadow-md'
                : 'bg-night-900 text-purple-200 hover:bg-night-850'
            }`}
          >
            <Settings className="h-4 w-4" />
          </button>

          <NotificationBell userRole="parent" />

          <button
            onClick={() => {
              audio.playTap();
              logout();
            }}
            className="p-2 rounded-xl bg-night-900 text-purple-400 hover:text-white transition"
            title="התנתק"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
              : statusMessage.type === 'warning'
              ? 'bg-amber-950/60 border-amber-500/50 text-amber-200'
              : 'bg-red-950/60 border-red-500/50 text-red-200'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* --- TAB 1: OVERVIEW --- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {activeScreenSessions.length > 0 && (
            <div className="space-y-2">
              {activeScreenSessions.map((session) => {
                const sourceLabel =
                  session.source === 'playstation' ? 'PlayStation' :
                  session.source === 'vr' ? 'VR' :
                  session.source === 'tv' ? 'טלוויזיה' :
                  session.source === 'computer' ? 'מחשב' :
                  session.source === 'tablet' ? 'טאבלט' :
                  session.source === 'phone' ? 'טלפון' :
                  session.source === 'youtube' ? 'YouTube' : 'אחר';
                const elapsedMinutes = Math.max(0, Math.floor(Number(session.elapsed_now || 0) / 60));
                const remainingMinutes = Math.max(0, Math.ceil(Number(session.remaining_now || 0) / 60));

                return (
                  <div
                    key={session.id}
                    className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className="h-4 w-4 text-cyan-300 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">
                          {session.child_name} · {sourceLabel}
                        </div>
                        <div className="text-[11px] text-cyan-200/80">
                          {session.status === 'paused'
                            ? 'מושהה'
                            : session.mode === 'self'
                            ? `משתמש עכשיו · ${elapsedMinutes} דקות`
                            : `זמן מסך פעיל · נותרו ${remainingMinutes} דקות`}
                        </div>
                      </div>
                    </div>
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0 animate-pulse"
                      style={{ backgroundColor: session.child_color || '#22d3ee' }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Actions Row */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                audio.playTap();
                setNewTemplateModal(true);
              }}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition"
            >
              <Plus className="h-4 w-4" />
              <span>משימה חדשה</span>
            </button>

            {totalPending > 0 && (
              <button
                onClick={() => setActiveTab('approvals')}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition animate-pulse"
              >
                <Clock className="h-4 w-4" />
                <span>{totalPending} אישורים ממתינים</span>
              </button>
            )}
          </div>

          {/* Children Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {children.map((child) => (
              <div
                key={child.id}
                className="rounded-3xl bg-night-900/80 border-2 border-purple-500/20 hover:border-gold-500/40 p-5 shadow-xl transition-all space-y-4"
              >
                {/* Child Card Header (Clickable for full history & breakdown) */}
                <div
                  onClick={() => openChildDetails(child)}
                  className="flex items-center justify-between cursor-pointer group hover:opacity-95 transition"
                  title="לחץ לצפייה בפירוט הפעילות והדקות של הילד"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-12 w-12 rounded-2xl flex items-center justify-center border-2 shadow-md group-hover:scale-105 transition"
                      style={{
                        borderColor: child.color,
                        backgroundColor: `${child.color}20`,
                      }}
                    >
                      <Sparkles className="h-6 w-6" style={{ color: child.color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-lg font-bold text-white group-hover:text-gold-300 transition">{child.name}</h2>
                        <ChevronLeft className="h-4 w-4 text-purple-400 group-hover:text-gold-400 group-hover:-translate-x-1 transition" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-purple-300">
                        <span className="font-semibold text-gold-400 font-cinzel">
                          {child.rankTitle} (רמה {child.level})
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-amber-400">
                          <Flame className="h-3.5 w-3.5" />
                          <span>{child.current_streak_days} ימים</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left">
                    <span
                      className={`text-3xl font-black font-cinzel ${
                        child.available_minutes < 0 ? 'text-red-400' : 'text-gold-400'
                      }`}
                    >
                      {child.available_minutes}
                    </span>
                    <span className="block text-[11px] text-purple-400 font-bold">דקות זמינות</span>
                  </div>
                </div>

                {/* Balance Today & Activity Breakdown */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-night-950/60 border border-purple-500/10">
                    <span className="text-purple-400 block text-[10px]">היום</span>
                    <span className="font-bold text-emerald-400">+{child.wallet.earnedToday} הרוויח</span>
                    <span className="text-purple-400 mx-1">/</span>
                    <span className="font-bold text-purple-300">-{child.wallet.spentToday} ניצל</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-night-950/60 border border-purple-500/10">
                    <span className="text-purple-400 block text-[10px]">השבוע</span>
                    <span className="font-bold text-emerald-400">+{child.wallet.earnedThisWeek}</span>
                    <span className="text-purple-400 mx-1">/</span>
                    <span className="font-bold text-purple-300">-{child.wallet.spentThisWeek}</span>
                  </div>
                </div>

                {/* Child Pending Badges */}
                <div className="flex items-center gap-2 text-xs">
                  {child.pendingApprovalsCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 font-medium">
                      {child.pendingApprovalsCount} משימות לאישור
                    </span>
                  )}
                  {child.pendingScreenRequestsCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-500/30 text-amber-300 font-medium">
                      {child.pendingScreenRequestsCount} בקשות מסך
                    </span>
                  )}
                  {child.openTasksCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-night-950 text-purple-400 font-medium">
                      {child.openTasksCount} משימות פתוחות
                    </span>
                  )}
                </div>

                {/* Action Buttons for Child */}
                <div className="pt-2 border-t border-purple-500/20 flex items-center gap-2">
                  <button
                    onClick={() => {
                      audio.playTap();
                      setAdjustModalChild(child);
                      setAdjustMinutesDelta(15);
                      setAdjustReason('');
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-night-950 hover:bg-night-850 border border-purple-500/30 text-purple-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-gold-400" />
                    <span>הוסף / הפחת דקות</span>
                  </button>

                  <button
                    onClick={() => {
                      audio.playTap();
                      setUsageModalChild(child);
                      setUsageMinutes(30);
                      setUsageReason('');
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-night-950 hover:bg-night-850 border border-purple-500/30 text-purple-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Tv className="h-3.5 w-3.5 text-purple-400" />
                    <span>רשום ניצול מסך</span>
                  </button>
                </div>

                {/* Direct link button to full details */}
                <button
                  onClick={() => openChildDetails(child)}
                  className="w-full py-2 px-3 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 text-purple-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <History className="h-3.5 w-3.5 text-gold-400" />
                  <span>פירוט מלא: ממה הרוויח ומה עשה</span>
                  <ChevronLeft className="h-3.5 w-3.5 text-gold-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 2: APPROVALS INBOX --- */}
      {activeTab === 'approvals' && (
        <div className="space-y-6">
          {/* Section A: Task Submissions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-gold-400" />
                <span>משימות שממתינות לאישור ({pendingTasks.length})</span>
              </h2>
              {pendingTasks.length > 1 && (
                <button
                  onClick={handleApproveAll}
                  className="py-1.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition"
                >
                  אשר את כולן
                </button>
              )}
            </div>

            {pendingTasks.length === 0 ? (
              <div className="p-8 rounded-2xl bg-night-900/50 border border-purple-500/20 text-center text-xs text-purple-400/60">
                אין משימות שממתינות לאישור.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTasks.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-2xl bg-night-900 border border-purple-500/30 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="font-bold text-sm px-2 py-0.5 rounded-lg border text-white"
                            style={{
                              borderColor: t.child_color || '#38bdf8',
                              backgroundColor: `${t.child_color || '#38bdf8'}30`,
                            }}
                          >
                            {t.child_name}
                          </span>
                          <h3 className="font-bold text-white text-sm">{t.title}</h3>
                        </div>
                        {t.description && (
                          <p className="text-xs text-purple-300/70">{t.description}</p>
                        )}
                        {t.submission_note && (
                          <p className="mt-2 text-xs text-amber-300 bg-amber-950/30 border border-amber-500/20 p-2 rounded-xl">
                            הערת הילד: "{t.submission_note}"
                          </p>
                        )}
                      </div>

                      <div className="text-left font-mono shrink-0">
                        <span className="text-lg font-black text-gold-400 font-cinzel">
                          {t.task_kind === 'mandatory' ? 'XP' : `+${t.reward_minutes}`}
                        </span>
                        <span className="block text-[10px] text-purple-400">
                          {t.task_kind === 'mandatory' ? 'משימת חובה' : 'דקות'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-purple-500/10 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleRejectTask(t.id)}
                        className="py-1.5 px-3 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-700/50 text-red-200 text-xs font-bold transition"
                      >
                        דחה
                      </button>

                      {t.task_kind !== 'mandatory' && (
                        <button
                          onClick={() => {
                            setCustomApprovalTask(t);
                            setCustomApprovalMinutes(t.reward_minutes);
                          }}
                          className="py-1.5 px-3 rounded-xl bg-night-950 hover:bg-night-850 border border-purple-500/30 text-purple-200 text-xs font-bold transition"
                        >
                          שנה דקות ואשר
                        </button>
                      )}

                      <button
                        onClick={() => handleApproveTask(t.id)}
                        className="py-1.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition"
                      >
                        {t.task_kind === 'mandatory' ? 'אשר (XP)' : `אשר (+${t.reward_minutes} דק׳)`}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section B: Screen Time Requests */}
          <div className="space-y-3 pt-6 border-t border-purple-500/20">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Tv className="h-5 w-5 text-gold-400" />
              <span>בקשות זמן מסך ({pendingRequests.length})</span>
            </h2>

            {pendingRequests.length === 0 ? (
              <div className="p-8 rounded-2xl bg-night-900/50 border border-purple-500/20 text-center text-xs text-purple-400/60">
                אין בקשות זמן מסך שממתינות לאישור.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-2xl bg-night-900 border border-gold-500/30 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="font-bold text-sm px-2 py-0.5 rounded-lg border text-white"
                            style={{
                              borderColor: r.child_color || '#38bdf8',
                              backgroundColor: `${r.child_color || '#38bdf8'}30`,
                            }}
                          >
                            {r.child_name}
                          </span>
                          <span className="text-sm font-bold text-white">
                            מבקש {r.requested_minutes} דקות עבור {r.source}
                          </span>
                        </div>
                        <p className="text-xs text-purple-400">
                          יתרה זמינה כעת בארנק: {r.available_minutes} דקות
                        </p>
                      </div>

                      <div className="text-left font-mono shrink-0">
                        <span className="text-lg font-black text-amber-400 font-cinzel">
                          {r.requested_minutes}
                        </span>
                        <span className="block text-[10px] text-purple-400">דקות</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-purple-500/10 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleReviewScreenTime(r.id, false)}
                        className="py-1.5 px-3 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-700/50 text-red-200 text-xs font-bold transition"
                      >
                        דחה
                      </button>

                      <button
                        onClick={() => {
                          const custom = prompt(`שנה כמות דקות עבור ${r.child_name}:`, String(r.requested_minutes));
                          if (custom && !isNaN(Number(custom))) {
                            handleReviewScreenTime(r.id, true, Number(custom));
                          }
                        }}
                        className="py-1.5 px-3 rounded-xl bg-night-950 hover:bg-night-850 border border-purple-500/30 text-purple-200 text-xs font-bold transition"
                      >
                        שנה כמות ואשר
                      </button>

                      <button
                        onClick={() => handleReviewScreenTime(r.id, true)}
                        className="py-1.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-gold-500 hover:from-amber-400 hover:to-gold-400 text-night-950 font-bold text-xs shadow-md transition"
                      >
                        אשר ({r.requested_minutes} דק׳)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 3: TASK TEMPLATES MANAGEMENT --- */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-gold-400" />
              <span>תבניות משימות פעילות ({templates.length})</span>
            </h2>
            <button
              onClick={() => {
                audio.playTap();
                setNewTemplateModal(true);
              }}
              className="py-2 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Plus className="h-4 w-4" />
              <span>תבנית חדשה</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="p-4 rounded-2xl bg-night-900 border border-purple-500/20 flex items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <h3 className="font-bold text-sm text-white">{tpl.title}</h3>
                  {tpl.description && (
                    <p className="text-xs text-purple-300/70">{tpl.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-purple-400">
                    <span className="font-semibold text-gold-400 font-cinzel">
                      {tpl.task_kind === 'mandatory' ? `חובה · XP (ערך ${tpl.reward_minutes})` : `+${tpl.reward_minutes} דקות`}
                    </span>
                    <span>•</span>
                    <span>
                      לו״ז:{' '}
                      {tpl.schedule_type === 'daily'
                        ? 'יומי'
                        : tpl.schedule_type === 'repeatable'
                        ? 'אימון חופשי (ללא הגבלה)'
                        : tpl.schedule_type === 'weekly'
                        ? 'שבועי'
                        : 'חד-פעמי'}
                    </span>
                    {tpl.assigned_child_ids && tpl.assigned_child_ids.length > 0 && tpl.assigned_child_ids.length < children.length && (
                      <>
                        <span>•</span>
                        <span className="text-purple-300">
                          עבור: {tpl.assigned_child_ids.map((id) => children.find((c) => c.id === id)?.name).filter(Boolean).join(', ')}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleDuplicateTemplate(tpl)}
                    className="p-2 rounded-xl text-cyan-300 hover:text-white hover:bg-cyan-950/50 border border-cyan-500/20 transition"
                    title="שכפל משימה"
                  >
                    <PlusCircle className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openEditTemplate(tpl)}
                    className="p-2 rounded-xl text-purple-300 hover:text-white hover:bg-purple-900/50 border border-purple-500/20 hover:border-purple-400/50 transition"
                    title="ערוך משימה"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleArchiveTemplate(tpl.id)}
                    className="p-2 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-950/50 border border-transparent hover:border-red-500/30 transition"
                    title="העבר לארכיון"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 4: FINANCIAL HISTORY & CORRECTIONS --- */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <History className="h-5 w-5 text-gold-400" />
            <span>ספר תנועות הדקות (Ledger)</span>
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-purple-500/20 bg-night-900">
            <table className="w-full text-right text-xs">
              <thead className="bg-night-950/80 text-purple-300 font-semibold border-b border-purple-500/20">
                <tr>
                  <th className="p-3">תאריך ושעה</th>
                  <th className="p-3">ילד</th>
                  <th className="p-3">סוג</th>
                  <th className="p-3">סיבה</th>
                  <th className="p-3">דקות</th>
                  <th className="p-3">יתרה</th>
                  <th className="p-3">פעולה</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/10">
                {history.map((tx) => (
                  <tr key={tx.id} className="hover:bg-purple-950/20 transition">
                    <td className="p-3 text-purple-400/80 whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleString('he-IL', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-3 font-bold text-white whitespace-nowrap">{tx.child_name}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tx.type === 'earn'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            : tx.type === 'spend'
                            ? 'bg-purple-950 text-purple-300 border border-purple-500/30'
                            : tx.type === 'refund'
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                            : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="p-3 text-purple-200">{tx.reason}</td>
                    <td className="p-3 font-mono font-bold whitespace-nowrap">
                      <span className={tx.amount > 0 ? 'text-emerald-400' : 'text-purple-300'}>
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-purple-400">{tx.balance_after}</td>
                    <td className="p-3">
                      {tx.type === 'spend' && tx.screen_usage_log_id && (
                        <button
                          onClick={() => handleCorrectUsage(tx)}
                          className="text-[10px] text-amber-400 hover:underline font-semibold"
                        >
                          תיקון / זיכוי
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 5: STATS --- */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gold-400" />
            <span>סטטיסטיקת שימוש וצבירה</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.map((s) => (
              <div key={s.childId} className="p-5 rounded-3xl bg-night-900 border border-purple-500/20 space-y-4">
                <h3 className="font-bold text-base text-gold-300">{s.childName}</h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2.5 rounded-xl bg-night-950 border border-purple-500/10">
                    <span className="text-purple-300">היום:</span>
                    <span className="font-bold text-emerald-400">+{s.earnedToday} דק׳</span>
                    <span className="font-bold text-purple-300">-{s.spentToday} דק׳</span>
                  </div>

                  <div className="flex justify-between p-2.5 rounded-xl bg-night-950 border border-purple-500/10">
                    <span className="text-purple-300">7 ימים אחרונים:</span>
                    <span className="font-bold text-emerald-400">+{s.earnedThisWeek} דק׳</span>
                    <span className="font-bold text-purple-300">-{s.spentThisWeek} דק׳</span>
                  </div>

                  <div className="flex justify-between p-2.5 rounded-xl bg-night-950 border border-purple-500/10">
                    <span className="text-purple-300">חודש נוכחי:</span>
                    <span className="font-bold text-emerald-400">+{s.earnedThisMonth} דק׳</span>
                    <span className="font-bold text-purple-300">-{s.spentThisMonth} דק׳</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 6: SETTINGS --- */}
      {activeTab === 'settings' && (
        <div className="space-y-6 max-w-lg">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-gold-400" />
            <span>הגדרות משפחתיות</span>
          </h2>

          <div className="p-5 rounded-3xl bg-night-900 border border-purple-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-white block">צלילי מערכת</span>
                <span className="text-xs text-purple-400">אפקטים קוליים של קסם ואישורים</span>
              </div>
              <button
                onClick={() => {
                  const now = !audio.isEnabled();
                  audio.setEnabled(now);
                  setStatusMessage({ text: now ? 'צלילים הופעלו' : 'צלילים הושתקו', type: 'success' });
                }}
                className="p-2.5 rounded-xl bg-night-950 border border-purple-500/30 text-purple-200"
              >
                {audio.isEnabled() ? <Volume2 className="h-5 w-5 text-gold-400" /> : <VolumeX className="h-5 w-5" />}
              </button>
            </div>

            <div className="pt-4 border-t border-purple-500/10">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm text-white">ילדי המשפחה</span>
                <button
                  onClick={() => {
                    audio.playTap();
                    setAddChildModal(true);
                  }}
                  className="flex items-center gap-1 text-xs text-gold-400 font-bold hover:underline"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>הוסף ילד</span>
                </button>
              </div>

              <div className="space-y-2">
                {children.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-night-950 border border-purple-500/10 flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-white">{c.name}</span>
                    <button
                      onClick={() => {
                        const newPin = prompt(`עדכון קוד סודי עבור ${c.name} (4 ספרות):`);
                        if (newPin && newPin.length >= 4) {
                          apiRequest(`/api/parent/children/${c.id}`, {
                            method: 'PUT',
                            body: JSON.stringify({ pin: newPin }),
                          }).then(() => {
                            setStatusMessage({ text: `הקוד של ${c.name} עודכן`, type: 'success' });
                          });
                        }
                      }}
                      className="text-purple-400 hover:text-gold-300 font-semibold"
                    >
                      שנה PIN
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: ADJUST MINUTES --- */}
      {adjustModalChild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-night-900 border border-gold-500/40 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-gold-300 font-cinzel">
                הוספה / הפחתת דקות · {adjustModalChild.name}
              </h3>
              <button onClick={() => setAdjustModalChild(null)}>
                <X className="h-5 w-5 text-purple-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleAdjustMinutes} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                  כמות דקות (חיובי לתוספת, שלילי להפחתה)
                </label>
                <input
                  type="number"
                  value={adjustMinutesDelta}
                  onChange={(e) => setAdjustMinutesDelta(Number(e.target.value))}
                  required
                  className="w-full rounded-xl bg-night-950 border border-purple-500/30 p-3 text-lg font-mono text-center text-white focus:outline-none focus:border-gold-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                  סיבה (חובה בהפחתה)
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="למשל: בונוס עזרה, או חריגה מזמן מסך"
                  className="w-full rounded-xl bg-night-950 border border-purple-500/30 p-3 text-sm text-white focus:outline-none focus:border-gold-400"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl font-bold text-night-950 bg-gradient-to-r from-gold-400 to-amber-400 hover:from-gold-300 transition text-sm shadow-md"
              >
                אישור ועדכון יתרה
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: MANUAL USAGE --- */}
      {usageModalChild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl bg-night-900 border border-purple-500/40 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-gold-300 font-cinzel">
                רישום ניצול מסך · {usageModalChild.name}
              </h3>
              <button onClick={() => setUsageModalChild(null)}>
                <X className="h-5 w-5 text-purple-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleLogUsage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                  דקות שנוצלו
                </label>
                <input
                  type="number"
                  min="1"
                  value={usageMinutes}
                  onChange={(e) => setUsageMinutes(Number(e.target.value))}
                  required
                  className="w-full rounded-xl bg-night-950 border border-purple-500/30 p-3 text-lg font-mono text-center text-white focus:outline-none focus:border-gold-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-purple-200 mb-1.5">מכשיר / מקור</label>
                <select
                  value={usageSource}
                  onChange={(e) => setUsageSource(e.target.value)}
                  className="w-full rounded-xl bg-night-950 border border-purple-500/30 p-3 text-sm text-white focus:outline-none focus:border-gold-400"
                >
                  <option value="playstation">PlayStation</option>
                  <option value="vr">VR</option>
                  <option value="tv">טלוויזיה</option>
                  <option value="computer">מחשב</option>
                  <option value="tablet">טאבלט</option>
                  <option value="phone">טלפון</option>
                  <option value="youtube">YouTube</option>
                  <option value="other">אחר</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-purple-200 mb-1.5">הערה (אופציונלי)</label>
                <input
                  type="text"
                  value={usageReason}
                  onChange={(e) => setUsageReason(e.target.value)}
                  placeholder="משחק עם חברים"
                  className="w-full rounded-xl bg-night-950 border border-purple-500/30 p-3 text-sm text-white focus:outline-none focus:border-gold-400"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 transition text-sm shadow-md"
              >
                רשום ניצול ועדכן ארנק
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CUSTOM APPROVAL MINUTES --- */}
      {customApprovalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-night-900 border border-gold-500/40 p-6 shadow-2xl">
            <h3 className="font-bold text-base text-gold-300 font-cinzel mb-2">שינוי תגמול ואישור</h3>
            <p className="text-xs text-purple-300 mb-4">{customApprovalTask.title}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-purple-200 mb-1">כמות דקות להענקה</label>
                <input
                  type="number"
                  min="0"
                  value={customApprovalMinutes}
                  onChange={(e) => setCustomApprovalMinutes(Number(e.target.value))}
                  className="w-full rounded-xl bg-night-950 border border-purple-500/30 p-3 text-lg font-mono text-center text-white focus:outline-none focus:border-gold-400"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCustomApprovalTask(null)}
                  className="flex-1 py-2.5 rounded-xl bg-night-950 border border-purple-500/30 text-purple-300 text-xs font-bold"
                >
                  ביטול
                </button>
                <button
                  type="button"
                  onClick={() => handleApproveTask(customApprovalTask.id, customApprovalMinutes)}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md"
                >
                  אשר {customApprovalMinutes} דקות
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: NEW TEMPLATE --- */}
      {newTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl bg-night-900 border border-purple-500/40 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-gold-300 font-cinzel">תבנית משימה חדשה</h3>
              <button onClick={() => setNewTemplateModal(false)}>
                <X className="h-5 w-5 text-purple-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-xs text-purple-200 mb-1">שם המשימה</label>
                <input
                  type="text"
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  required
                  placeholder="למשל: סידור החדר"
                  className="w-full rounded-xl bg-night-950 border border-purple-500/30 p-2.5 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-purple-200 mb-1">תיאור</label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="פירוט המשימה..."
                  rows={2}
                  className="w-full rounded-xl bg-night-950 border border-purple-500/30 p-2.5 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-purple-200 mb-1">{templateKind === 'mandatory' ? 'ערך משימה (ל-XP)' : 'תגמול (דקות)'}</label>
                  <input
                    type="number"
                    min="1"
                    value={templateReward}
                    onChange={(e) => setTemplateReward(Number(e.target.value))}
                    required
                    className="w-full rounded-xl bg-night-950 border border-purple-500/30 p-2 text-center text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-purple-200 mb-1">תדירות</label>
                  <select
                    value={templateSchedule}
                    onChange={(e) => setTemplateSchedule(e.target.value as any)}
                    className="w-full rounded-xl bg-night-950 border border-purple-500/30 p-2 text-xs text-white"
                  >
                    <option value="daily">יומי (פעם ביום)</option>
                    <option value="repeatable">ללא הגבלה (אימון חוזר / כל פעם מחדש)</option>
                    <option value="weekly">שבועי</option>
                    <option value="custom">ימים מותאמים</option>
                    <option value="one_time">חד-פעמי</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-purple-200 mb-1.5">סוג משימה</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setTemplateKind('bonus')}
                    className={`py-2 rounded-xl text-xs font-bold border ${templateKind === 'bonus' ? 'bg-gold-500 text-night-950 border-gold-400' : 'bg-night-950 text-purple-300 border-purple-500/20'}`}>
                    בונוס · דקות + XP
                  </button>
                  <button type="button" onClick={() => setTemplateKind('mandatory')}
                    className={`py-2 rounded-xl text-xs font-bold border ${templateKind === 'mandatory' ? 'bg-purple-600 text-white border-purple-400' : 'bg-night-950 text-purple-300 border-purple-500/20'}`}>
                    חובה · XP בלבד
                  </button>
                </div>
              </div>

              {(templateSchedule === 'weekly' || templateSchedule === 'custom') && (
                <div>
                  <label className="block text-xs text-purple-200 mb-1.5">ימים</label>
                  <div className="grid grid-cols-7 gap-1">
                    {weekDays.map((day) => (
                      <button key={day.id} type="button" onClick={() => toggleDay(day.id, templateDays, setTemplateDays)}
                        className={`h-9 rounded-lg text-xs font-bold border ${templateDays.includes(day.id) ? 'bg-purple-600 border-purple-400 text-white' : 'bg-night-950 border-purple-500/20 text-purple-300'}`}>
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {templateSchedule === 'one_time' && (
                <div>
                  <label className="block text-xs text-purple-200 mb-1">תאריך</label>
                  <input type="date" required value={templateOneTimeDate} onChange={(e) => setTemplateOneTimeDate(e.target.value)}
                    className="w-full rounded-xl bg-night-950 border border-purple-500/30 p-2.5 text-sm text-white" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-purple-200 mb-1">משעה (אופציונלי)</label>
                  <input type="time" value={templateTimeStart} onChange={(e) => setTemplateTimeStart(e.target.value)}
                    className="w-full rounded-xl bg-night-950 border border-purple-500/30 p-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs text-purple-200 mb-1">עד שעה (אופציונלי)</label>
                  <input type="time" value={templateTimeEnd} onChange={(e) => setTemplateTimeEnd(e.target.value)}
                    className="w-full rounded-xl bg-night-950 border border-purple-500/30 p-2 text-sm text-white" />
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-500/20 bg-night-950/70 p-3 space-y-2">
                <label className="flex items-center justify-between text-xs text-cyan-200 font-semibold">אימות AI לתיעוד<input type="checkbox" checked={templateAiEnabled} onChange={(e) => { setTemplateAiEnabled(e.target.checked); if (!e.target.checked) { setTemplateAllowVideo(false); setTemplateAutoApprove(false); } }} /></label>
                {templateAiEnabled && <><textarea value={templateAiInstructions} onChange={(e) => setTemplateAiInstructions(e.target.value)} rows={2} placeholder="מה צריך להופיע בראיה כדי להוכיח שהמשימה הושלמה?" className="w-full rounded-xl bg-night-900 border border-cyan-500/20 p-2 text-xs text-white"/><label className="flex items-center justify-between text-xs text-purple-200">אפשר גם וידאו קצר<input type="checkbox" checked={templateAllowVideo} onChange={(e) => setTemplateAllowVideo(e.target.checked)}/></label><label className="flex items-center justify-between text-xs text-purple-200">אישור אוטומטי לצילום-מסך לימודי ברור בלבד<input type="checkbox" checked={templateAutoApprove} onChange={(e) => setTemplateAutoApprove(e.target.checked)}/></label><p className="text-[10px] text-purple-500">מצלמה ווידאו לעולם לא יאושרו אוטומטית. כש-AI לא בטוח, התיעוד עובר אליך.</p></>}
              </div>

              {children.length > 0 && (
                <div>
                  <label className="block text-xs text-purple-200 mb-1.5">משויך לילדים:</label>
                  <div className="flex flex-wrap gap-1.5">
                    {children.map((c) => {
                      const isSelected = templateChildIds.length === 0 || templateChildIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            if (templateChildIds.length === 0) {
                              setTemplateChildIds(children.filter((x) => x.id !== c.id).map((x) => x.id));
                            } else if (templateChildIds.includes(c.id)) {
                              if (templateChildIds.length > 1) {
                                setTemplateChildIds(templateChildIds.filter((id) => id !== c.id));
                              }
                            } else {
                              setTemplateChildIds([...templateChildIds, c.id]);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition ${
                            isSelected
                              ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                              : 'bg-night-950 border-purple-500/20 text-purple-300/60 hover:text-white'
                          }`}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-2xl font-bold text-night-950 bg-gradient-to-r from-gold-400 to-amber-400 text-sm shadow-md"
              >
                צור משימה
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: EDIT TEMPLATE --- */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl bg-night-900 border border-purple-500/40 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-gold-300 font-cinzel">עריכת תבנית משימה</h3>
              <button onClick={() => setEditingTemplate(null)}>
                <X className="h-5 w-5 text-purple-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleUpdateTemplate} className="space-y-4">
              <div>
                <label className="block text-xs text-purple-200 mb-1">שם המשימה</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  placeholder="שם המשימה..."
                  className="w-full rounded-xl bg-night-950 border border-purple-500/30 p-2.5 text-sm text-white focus:outline-none focus:border-gold-400"
                />
              </div>

              <div>
                <label className="block text-xs text-purple-200 mb-1">תיאור</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="פירוט המשימה..."
                  rows={2}
                  className="w-full rounded-xl bg-night-950 border border-purple-500/30 p-2.5 text-xs text-white focus:outline-none focus:border-gold-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-purple-200 mb-1">{editKind === 'mandatory' ? 'ערך משימה (ל-XP)' : 'תגמול (דקות)'}</label>
                  <input
                    type="number"
                    min="1"
                    value={editReward}
                    onChange={(e) => setEditReward(Number(e.target.value))}
                    required
                    className="w-full rounded-xl bg-night-950 border border-purple-500/30 p-2 text-center text-sm font-mono text-white focus:outline-none focus:border-gold-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-purple-200 mb-1">תדירות</label>
                  <select
                    value={editSchedule}
                    onChange={(e) => setEditSchedule(e.target.value as any)}
                    className="w-full rounded-xl bg-night-950 border border-purple-500/30 p-2 text-xs text-white focus:outline-none focus:border-gold-400"
                  >
                    <option value="daily">יומי (פעם ביום)</option>
                    <option value="repeatable">ללא הגבלה (אימון חוזר / כל פעם מחדש)</option>
                    <option value="weekly">שבועי</option>
                    <option value="custom">ימים מותאמים</option>
                    <option value="one_time">חד-פעמי</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-purple-200 mb-1.5">סוג משימה</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setEditKind('bonus')}
                    className={`py-2 rounded-xl text-xs font-bold border ${editKind === 'bonus' ? 'bg-gold-500 text-night-950 border-gold-400' : 'bg-night-950 text-purple-300 border-purple-500/20'}`}>
                    בונוס · דקות + XP
                  </button>
                  <button type="button" onClick={() => setEditKind('mandatory')}
                    className={`py-2 rounded-xl text-xs font-bold border ${editKind === 'mandatory' ? 'bg-purple-600 text-white border-purple-400' : 'bg-night-950 text-purple-300 border-purple-500/20'}`}>
                    חובה · XP בלבד
                  </button>
                </div>
              </div>

              {(editSchedule === 'weekly' || editSchedule === 'custom') && (
                <div>
                  <label className="block text-xs text-purple-200 mb-1.5">ימים</label>
                  <div className="grid grid-cols-7 gap-1">
                    {weekDays.map((day) => (
                      <button key={day.id} type="button" onClick={() => toggleDay(day.id, editDays, setEditDays)}
                        className={`h-9 rounded-lg text-xs font-bold border ${editDays.includes(day.id) ? 'bg-purple-600 border-purple-400 text-white' : 'bg-night-950 border-purple-500/20 text-purple-300'}`}>
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {editSchedule === 'one_time' && (
                <div>
                  <label className="block text-xs text-purple-200 mb-1">תאריך</label>
                  <input type="date" required value={editOneTimeDate} onChange={(e) => setEditOneTimeDate(e.target.value)}
                    className="w-full rounded-xl bg-night-950 border border-purple-500/30 p-2.5 text-sm text-white" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-purple-200 mb-1">משעה (אופציונלי)</label>
                  <input type="time" value={editTimeStart} onChange={(e) => setEditTimeStart(e.target.value)}
                    className="w-full rounded-xl bg-night-950 border border-purple-500/30 p-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs text-purple-200 mb-1">עד שעה (אופציונלי)</label>
                  <input type="time" value={editTimeEnd} onChange={(e) => setEditTimeEnd(e.target.value)}
                    className="w-full rounded-xl bg-night-950 border border-purple-500/30 p-2 text-sm text-white" />
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-500/20 bg-night-950/70 p-3 space-y-2">
                <label className="flex items-center justify-between text-xs text-cyan-200 font-semibold">אימות AI לתיעוד<input type="checkbox" checked={editAiEnabled} onChange={(e) => { setEditAiEnabled(e.target.checked); if (!e.target.checked) { setEditAllowVideo(false); setEditAutoApprove(false); } }} /></label>
                {editAiEnabled && <><textarea value={editAiInstructions} onChange={(e) => setEditAiInstructions(e.target.value)} rows={2} placeholder="מה צריך להופיע בראיה?" className="w-full rounded-xl bg-night-900 border border-cyan-500/20 p-2 text-xs text-white"/><label className="flex items-center justify-between text-xs text-purple-200">אפשר גם וידאו קצר<input type="checkbox" checked={editAllowVideo} onChange={(e) => setEditAllowVideo(e.target.checked)}/></label><label className="flex items-center justify-between text-xs text-purple-200">אישור אוטומטי לצילום-מסך לימודי ברור בלבד<input type="checkbox" checked={editAutoApprove} onChange={(e) => setEditAutoApprove(e.target.checked)}/></label></>}
              </div>

              {children.length > 0 && (
                <div>
                  <label className="block text-xs text-purple-200 mb-1.5">משויך לילדים:</label>
                  <div className="flex flex-wrap gap-1.5">
                    {children.map((c) => {
                      const isSelected = editChildIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              if (editChildIds.length > 1) {
                                setEditChildIds(editChildIds.filter((id) => id !== c.id));
                              }
                            } else {
                              setEditChildIds([...editChildIds, c.id]);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition ${
                            isSelected
                              ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                              : 'bg-night-950 border-purple-500/20 text-purple-300/60 hover:text-white'
                          }`}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="flex-1 py-3 rounded-2xl bg-night-950 border border-purple-500/30 text-purple-300 text-xs font-bold hover:bg-night-850 transition"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl font-bold text-night-950 bg-gradient-to-r from-gold-400 to-amber-400 text-sm shadow-md hover:from-gold-300 hover:to-amber-300 transition"
                >
                  שמור שינויים
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: ADD CHILD --- */}
      {addChildModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl bg-night-900 border border-purple-500/40 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-gold-300 font-cinzel">הוספת ילד למשפחה</h3>
              <button onClick={() => setAddChildModal(false)}>
                <X className="h-5 w-5 text-purple-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleAddChild} className="space-y-4">
              <div>
                <label className="block text-xs text-purple-200 mb-1">שם הילד</label>
                <input
                  type="text"
                  value={newChildName}
                  onChange={(e) => setNewChildName(e.target.value)}
                  required
                  placeholder="שם הילד"
                  className="w-full rounded-xl bg-night-950 border border-purple-500/30 p-2.5 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-purple-200 mb-1">קוד PIN (4 ספרות)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={newChildPin}
                  onChange={(e) => setNewChildPin(e.target.value)}
                  placeholder="1234"
                  maxLength={6}
                  className="w-full rounded-xl bg-night-950 border border-purple-500/30 p-2.5 text-center font-mono text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-purple-200 mb-1">צבע אישי</label>
                <div className="flex gap-2">
                  {['#38bdf8', '#10b981', '#f5c842', '#a855f7', '#ec4899', '#f97316'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewChildColor(c)}
                      className={`h-7 w-7 rounded-full border-2 transition ${
                        newChildColor === c ? 'border-white scale-110' : 'border-transparent opacity-60'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl font-bold text-night-950 bg-gradient-to-r from-gold-400 to-amber-400 text-sm shadow-md"
              >
                הוסף ילד לאקדמיה
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CHILD SPECIFIC ACTIVITY & LEDGER DETAILS --- */}
      {selectedChildDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-night-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-night-900 border border-purple-500/40 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-purple-500/20 bg-night-950/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="h-12 w-12 rounded-2xl flex items-center justify-center border-2 shadow-md shrink-0"
                  style={{
                    borderColor: selectedChildDetails.child.color || '#38bdf8',
                    backgroundColor: `${selectedChildDetails.child.color || '#38bdf8'}25`,
                  }}
                >
                  <Sparkles className="h-6 w-6" style={{ color: selectedChildDetails.child.color || '#38bdf8' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{selectedChildDetails.child.name}</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/60 border border-purple-500/30 text-gold-300 font-cinzel">
                      {selectedChildDetails.child.rankTitle} (רמה {selectedChildDetails.child.level})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-purple-300">
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <Flame className="h-3.5 w-3.5" />
                      <span>רצף {selectedChildDetails.child.current_streak_days} ימים</span>
                    </span>
                    <span>•</span>
                    <span>XP: {selectedChildDetails.child.xp}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-left">
                  <span
                    className={`text-2xl sm:text-3xl font-black font-cinzel ${
                      selectedChildDetails.child.available_minutes < 0 ? 'text-red-400' : 'text-gold-400'
                    }`}
                  >
                    {selectedChildDetails.child.available_minutes}
                  </span>
                  <span className="block text-[10px] text-purple-400 font-bold">יתרת דקות זמינה</span>
                </div>
                <button
                  onClick={() => setSelectedChildDetails(null)}
                  className="p-2 rounded-xl text-purple-400 hover:text-white hover:bg-purple-950/60 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="p-4 sm:p-5 bg-night-950/40 border-b border-purple-500/20 grid grid-cols-3 gap-2 sm:gap-3 text-center">
              <div className="p-2.5 rounded-2xl bg-night-900/80 border border-purple-500/20">
                <span className="text-[10px] text-purple-400 block font-semibold mb-1">היום</span>
                <div className="text-xs font-bold text-emerald-400">+{selectedChildDetails.wallet?.earnedToday || 0} הרוויח</div>
                <div className="text-xs font-bold text-purple-300">-{selectedChildDetails.wallet?.spentToday || 0} ניצל</div>
              </div>

              <div className="p-2.5 rounded-2xl bg-night-900/80 border border-purple-500/20">
                <span className="text-[10px] text-purple-400 block font-semibold mb-1">השבוע</span>
                <div className="text-xs font-bold text-emerald-400">+{selectedChildDetails.wallet?.earnedThisWeek || 0} הרוויח</div>
                <div className="text-xs font-bold text-purple-300">-{selectedChildDetails.wallet?.spentThisWeek || 0} ניצל</div>
              </div>

              <div className="p-2.5 rounded-2xl bg-night-900/80 border border-purple-500/20">
                <span className="text-[10px] text-purple-400 block font-semibold mb-1">החודש</span>
                <div className="text-xs font-bold text-emerald-400">+{selectedChildDetails.wallet?.earnedThisMonth || 0} הרוויח</div>
                <div className="text-xs font-bold text-purple-300">-{selectedChildDetails.wallet?.spentThisMonth || 0} ניצל</div>
              </div>
            </div>

            {/* Tab navigation inside modal */}
            <div className="flex border-b border-purple-500/20 px-4 pt-2 gap-2 bg-night-900">
              <button
                onClick={() => setChildDetailsTab('transactions')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                  childDetailsTab === 'transactions'
                    ? 'border-gold-400 text-gold-300'
                    : 'border-transparent text-purple-400 hover:text-purple-200'
                }`}
              >
                <History className="h-4 w-4" />
                <span>תנועות ורווח דקות ({selectedChildDetails.transactions?.length || 0})</span>
              </button>

              <button
                onClick={() => setChildDetailsTab('tasks')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                  childDetailsTab === 'tasks'
                    ? 'border-gold-400 text-gold-300'
                    : 'border-transparent text-purple-400 hover:text-purple-200'
                }`}
              >
                <ListTodo className="h-4 w-4" />
                <span>משימות ({selectedChildDetails.tasks?.length || 0})</span>
              </button>

              <button
                onClick={() => setChildDetailsTab('requests')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                  childDetailsTab === 'requests'
                    ? 'border-gold-400 text-gold-300'
                    : 'border-transparent text-purple-400 hover:text-purple-200'
                }`}
              >
                <Tv className="h-4 w-4" />
                <span>בקשות מסך ({selectedChildDetails.screenRequests?.length || 0})</span>
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {childDetailsLoading && (
                <div className="py-12 text-center text-xs text-purple-300">טוען נתונים...</div>
              )}

              {/* 1. TRANSACTIONS TAB */}
              {!childDetailsLoading && childDetailsTab === 'transactions' && (
                <div className="space-y-2">
                  {selectedChildDetails.transactions?.length === 0 ? (
                    <div className="py-8 text-center text-xs text-purple-400/60">אין עדיין תנועות דקות רשומות</div>
                  ) : (
                    selectedChildDetails.transactions.map((tx: any) => {
                      const isEarn = tx.type === 'earn' || tx.amount > 0;
                      return (
                        <div
                          key={tx.id}
                          className="p-3 rounded-2xl bg-night-950/60 border border-purple-500/20 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                isEarn
                                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-red-950/80 text-red-400 border border-red-500/30'
                              }`}
                            >
                              {isEarn ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                            </span>
                            <div>
                              <div className="font-bold text-xs text-white">{tx.reason || (isEarn ? 'הרוויח דקות' : 'ניצול דקות מסך')}</div>
                              <div className="text-[10px] text-purple-400/70 mt-0.5">
                                {new Date(tx.created_at).toLocaleString('he-IL', {
                                  month: 'numeric',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                                {' • '}
                                <span>יתרה אחרי: {tx.balance_after} דק׳</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-left shrink-0">
                            <span className={`font-mono font-bold text-sm ${isEarn ? 'text-emerald-400' : 'text-red-400'}`}>
                              {isEarn ? `+${tx.amount}` : tx.amount} דק׳
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* 2. TASKS TAB */}
              {!childDetailsLoading && childDetailsTab === 'tasks' && (
                <div className="space-y-2">
                  {selectedChildDetails.tasks?.length === 0 ? (
                    <div className="py-8 text-center text-xs text-purple-400/60">אין משימות מוגדרות להיום</div>
                  ) : (
                    selectedChildDetails.tasks.map((task: any) => (
                      <div
                        key={task.id}
                        className="p-3 rounded-2xl bg-night-950/60 border border-purple-500/20 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="font-bold text-xs text-white">{task.title}</div>
                          {task.description && (
                            <div className="text-[11px] text-purple-300/70 mt-0.5">{task.description}</div>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-purple-400">
                            <span className="font-semibold text-gold-400 font-cinzel">+{task.reward_minutes} דקות</span>
                            <span>•</span>
                            <span>
                              סטטוס:{' '}
                              {task.status === 'approved'
                                ? 'אושר ✅'
                                : task.status === 'submitted'
                                ? 'ממתין לאישורך ⏳'
                                : 'פתוח לביצוע 📌'}
                            </span>
                          </div>
                        </div>

                        {task.status === 'submitted' && (
                          <button
                            onClick={async () => {
                              await handleApproveTask(task.id);
                              await openChildDetails(selectedChildDetails.child);
                            }}
                            className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shrink-0 transition"
                          >
                            אשר משימה
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 3. SCREEN REQUESTS TAB */}
              {!childDetailsLoading && childDetailsTab === 'requests' && (
                <div className="space-y-2">
                  {selectedChildDetails.screenRequests?.length === 0 ? (
                    <div className="py-8 text-center text-xs text-purple-400/60">אין בקשות זמן מסך</div>
                  ) : (
                    selectedChildDetails.screenRequests.map((req: any) => (
                      <div
                        key={req.id}
                        className="p-3 rounded-2xl bg-night-950/60 border border-purple-500/20 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="font-bold text-xs text-white">
                            {req.requested_minutes} דקות עבור {req.source}
                          </div>
                          <div className="text-[10px] text-purple-400/70 mt-0.5">
                            {new Date(req.requested_at).toLocaleString('he-IL', {
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                            req.status === 'approved'
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                              : req.status === 'rejected'
                              ? 'bg-red-950/80 text-red-400 border border-red-500/30'
                              : 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {req.status === 'approved'
                            ? `אושר (${req.approved_minutes} דק׳)`
                            : req.status === 'rejected'
                            ? 'נדחה'
                            : 'ממתין לאישור'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 border-t border-purple-500/20 bg-night-950 flex items-center gap-2">
              <button
                onClick={() => {
                  setAdjustModalChild(selectedChildDetails.child);
                  setAdjustMinutesDelta(15);
                  setAdjustReason('');
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-night-900 hover:bg-night-850 border border-purple-500/30 text-purple-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="h-4 w-4 text-gold-400" />
                <span>הוסף / הפחת דקות</span>
              </button>

              <button
                onClick={() => {
                  setUsageModalChild(selectedChildDetails.child);
                  setUsageMinutes(30);
                  setUsageReason('');
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-night-900 hover:bg-night-850 border border-purple-500/30 text-purple-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Tv className="h-4 w-4 text-purple-400" />
                <span>רשום ניצול מסך</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
