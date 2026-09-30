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
} from 'lucide-react';

export const ParentDashboard: React.FC = () => {
  const { user, logout, familyName } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'tasks' | 'usage' | 'history' | 'stats' | 'settings'>('overview');
  const [loading, setLoading] = useState(true);

  // Data
  const [children, setChildren] = useState<ChildSummary[]>([]);
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
  const [templateSchedule, setTemplateSchedule] = useState<'daily' | 'weekly' | 'custom' | 'repeatable'>('daily');
  const [templateChildIds, setTemplateChildIds] = useState<string[]>([]);

  // Edit template state
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplateItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editReward, setEditReward] = useState<number>(15);
  const [editSchedule, setEditSchedule] = useState<'daily' | 'weekly' | 'custom' | 'repeatable'>('daily');
  const [editChildIds, setEditChildIds] = useState<string[]>([]);

  const [addChildModal, setAddChildModal] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildPin, setNewChildPin] = useState('');
  const [newChildColor, setNewChildColor] = useState('#38bdf8');

  // Load parent data
  const loadDashboard = async () => {
    try {
      const res = await apiRequest('/api/parent/dashboard');
      setChildren(res.children || []);

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
          assignedChildIds: templateChildIds.length > 0 ? templateChildIds : children.map((c) => c.id),
        }),
      });
      audio.playApproval();
      setNewTemplateModal(false);
      setTemplateTitle('');
      setTemplateDescription('');
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
    setEditChildIds(tpl.assigned_child_ids && tpl.assigned_child_ids.length > 0 ? tpl.assigned_child_ids : children.map((c) => c.id));
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
          assignedChildIds: editChildIds.length > 0 ? editChildIds : children.map((c) => c.id),
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

  // Add child
  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    audio.playTap();

    try {
      await apiRequest('/api/parent/children', {
        method: 'POST',
        body: JSON.stringify({
          name: newChildName.trim(),
          pin: newChildPin || '1234',
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
                {/* Child Card Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-12 w-12 rounded-2xl flex items-center justify-center border-2 shadow-md"
                      style={{
                        borderColor: child.color,
                        backgroundColor: `${child.color}20`,
                      }}
                    >
                      <Sparkles className="h-6 w-6" style={{ color: child.color }} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">{child.name}</h2>
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
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-gold-400" />
              <span>משימות שממתינות לאישור ({pendingTasks.length})</span>
            </h2>

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
                          +{t.reward_minutes}
                        </span>
                        <span className="block text-[10px] text-purple-400">דקות</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-purple-500/10 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleRejectTask(t.id)}
                        className="py-1.5 px-3 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-700/50 text-red-200 text-xs font-bold transition"
                      >
                        דחה
                      </button>

                      <button
                        onClick={() => {
                          setCustomApprovalTask(t);
                          setCustomApprovalMinutes(t.reward_minutes);
                        }}
                        className="py-1.5 px-3 rounded-xl bg-night-950 hover:bg-night-850 border border-purple-500/30 text-purple-200 text-xs font-bold transition"
                      >
                        שנה דקות ואשר
                      </button>

                      <button
                        onClick={() => handleApproveTask(t.id)}
                        className="py-1.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition"
                      >
                        אשר (+{t.reward_minutes} דק׳)
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
                      +{tpl.reward_minutes} דקות
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
          <div className="w-full max-w-sm rounded-3xl bg-night-900 border border-purple-500/40 p-6 shadow-2xl">
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
          <div className="w-full max-w-sm rounded-3xl bg-night-900 border border-purple-500/40 p-6 shadow-2xl">
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
                  <label className="block text-xs text-purple-200 mb-1">תגמול (דקות)</label>
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
                    <option value="one_time">חד-פעמי</option>
                  </select>
                </div>
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
          <div className="w-full max-w-sm rounded-3xl bg-night-900 border border-purple-500/40 p-6 shadow-2xl">
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
                  <label className="block text-xs text-purple-200 mb-1">תגמול (דקות)</label>
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
                    <option value="one_time">חד-פעמי</option>
                  </select>
                </div>
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
          <div className="w-full max-w-sm rounded-3xl bg-night-900 border border-purple-500/40 p-6 shadow-2xl">
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
    </div>
  );
};
