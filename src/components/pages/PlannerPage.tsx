/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  ListTodo,
  Bot,
  UserCheck,
  AlertOctagon,
  Clock,
  CheckCircle2,
  Filter,
  Plus,
  ChevronDown,
  Info,
  Shield,
  Layers,
  ArrowRight,
  GitBranch,
  ShieldAlert,
  BookOpen,
  Download,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Search,
  Sparkles,
  AlertTriangle,
  FolderLock,
  Share2
} from 'lucide-react';
import {
  PlannerTask,
  PlannerFunctionalCategory,
  ResponsibleParty,
  TaskStatus,
  TaskPriority,
  NavigationPage,
  InvestigationDraft,
  IntegrationPlan,
  RiskRegisterItem,
  StructuredImplementationGuide
} from '../../shared/types.ts';

interface PlannerPageProps {
  initialTasks?: PlannerTask[];
  investigations?: InvestigationDraft[];
  activeInvestigationId?: string;
  sharedPlanId?: string | null;
  isSharedReadOnly?: boolean;
  onNavigate: (page: NavigationPage) => void;
  onExitSharedView?: () => void;
}

export const PlannerPage: React.FC<PlannerPageProps> = ({
  initialTasks = [],
  investigations = [],
  activeInvestigationId: propActiveId,
  sharedPlanId = null,
  isSharedReadOnly = false,
  onNavigate,
  onExitSharedView
}) => {
  // Plan State
  const [plans, setPlans] = useState<IntegrationPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedInvestigationId, setSelectedInvestigationId] = useState<string>(
    propActiveId || 'inv_discord_demo'
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLinkCopied, setIsLinkCopied] = useState<boolean>(false);
  const [notFoundPlanId, setNotFoundPlanId] = useState<string | null>(null);

  // Active View Tab: 'matrix' | 'graph' | 'risks' | 'guide'
  const [activeTab, setActiveTab] = useState<'matrix' | 'graph' | 'risks' | 'guide'>('matrix');

  // Filters
  const [filterParty, setFilterParty] = useState<'all' | 'agent_prepared' | 'human_required'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | TaskStatus>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Guide & Export UI states
  const [copiedSectionIndex, setCopiedSectionIndex] = useState<number | null>(null);
  const [copiedSnippetIndex, setCopiedSnippetIndex] = useState<number | null>(null);
  const [expandedGuideSection, setExpandedGuideSection] = useState<number | null>(1);
  const [selectedClaimDetail, setSelectedClaimDetail] = useState<string | null>(null);

  // Load plans from backend
  useEffect(() => {
    async function fetchPlans() {
      try {
        setLoading(true);
        const res = await fetch('/api/plans');
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            setPlans(json.data);

            if (sharedPlanId) {
              const matched = json.data.find(
                (p: IntegrationPlan) =>
                  p.id === sharedPlanId ||
                  p.investigationId === sharedPlanId ||
                  p.id === `plan_${sharedPlanId}`
              );
              if (matched) {
                setSelectedPlanId(matched.id);
                setNotFoundPlanId(null);
                setActiveTab('guide');
              } else {
                setSelectedPlanId('');
                setNotFoundPlanId(sharedPlanId);
              }
            } else {
              // Default to matching propActiveId or first plan
              const match = json.data.find(
                (p: IntegrationPlan) =>
                  p.investigationId === propActiveId || p.id === `plan_${propActiveId}`
              );
              setSelectedPlanId(match ? match.id : json.data[0].id);
              setNotFoundPlanId(null);
            }
          } else if (sharedPlanId) {
            setSelectedPlanId('');
            setNotFoundPlanId(sharedPlanId);
          }
        } else if (sharedPlanId) {
          setSelectedPlanId('');
          setNotFoundPlanId(sharedPlanId);
        }
      } catch (err) {
        console.warn('[PlannerPage] Failed to fetch plans:', err);
        if (sharedPlanId) {
          setNotFoundPlanId(sharedPlanId);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchPlans();
  }, [propActiveId, sharedPlanId]);

  // Sync selected plan with selectedInvestigationId when not in shared mode
  useEffect(() => {
    if (propActiveId && !sharedPlanId) {
      setSelectedInvestigationId(propActiveId);
      const match = plans.find(
        (p) => p.investigationId === propActiveId || p.id === `plan_${propActiveId}`
      );
      if (match) setSelectedPlanId(match.id);
    }
  }, [propActiveId, plans, sharedPlanId]);

  const currentPlan = useMemo(() => {
    if (notFoundPlanId) return null;
    return plans.find((p) => p.id === selectedPlanId) || (plans.length > 0 && !sharedPlanId ? plans[0] : null);
  }, [plans, selectedPlanId, notFoundPlanId, sharedPlanId]);

  const handleCopyShareableLink = async () => {
    if (!currentPlan) return;
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      const shareUrl = `${origin}${pathname}?plan=${encodeURIComponent(currentPlan.id)}`;
      await navigator.clipboard.writeText(shareUrl);
      setIsLinkCopied(true);
      setTimeout(() => setIsLinkCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy shareable link:', err);
    }
  };

  // Handle plan generation from selected investigation
  const handleGeneratePlan = async (investigationId: string) => {
    try {
      setIsGenerating(true);
      setError(null);
      const res = await fetch('/api/plans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ investigationId })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || 'Failed to generate plan');
      }

      const json = await res.json();
      if (json.data) {
        setPlans((prev) => [json.data, ...prev.filter((p) => p.id !== json.data.id)]);
        setSelectedPlanId(json.data.id);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while generating the plan.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Update Task Status
  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if (!currentPlan || isSharedReadOnly) return;

    // Optimistic UI update
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== currentPlan.id) return p;
        const updatedTasks = p.tasks.map((t) => {
          if ((t.taskId || t.id) === taskId) {
            return {
              ...t,
              status: newStatus,
              blockerInfo:
                newStatus === 'blocked'
                  ? { isBlocked: true, blockedReason: 'Flagged as blocked in engineering plan.' }
                  : undefined
            };
          }
          return t;
        });

        return {
          ...p,
          tasks: updatedTasks,
          responsibilityMatrix: {
            ...p.responsibilityMatrix,
            completedCount: updatedTasks.filter((t) => t.status === 'completed').length,
            blockedCount: updatedTasks.filter((t) => t.status === 'blocked').length
          }
        };
      })
    );

    // Backend sync
    try {
      await fetch(`/api/plans/${currentPlan.id}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          notes: newStatus === 'blocked' ? 'Flagged as blocked in plan board' : undefined
        })
      });
    } catch (err) {
      console.error('[PlannerPage] Error persisting task status update:', err);
    }
  };

  // Regenerate Guide
  const handleRegenerateGuide = async () => {
    if (!currentPlan) return;
    try {
      setIsGenerating(true);
      const res = await fetch(`/api/plans/${currentPlan.id}/regenerate-guide`, {
        method: 'POST'
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setPlans((prev) => prev.map((p) => (p.id === currentPlan.id ? json.data : p)));
        }
      }
    } catch (err) {
      console.error('[PlannerPage] Error regenerating guide:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Filtered Tasks for Task Board
  const filteredTasks = useMemo(() => {
    if (!currentPlan) return [];
    return currentPlan.tasks.filter((t) => {
      // Party filter
      if (filterParty !== 'all' && t.responsibleParty !== filterParty) return false;
      // Category filter
      if (filterCategory !== 'all' && t.functionalCategory !== filterCategory) return false;
      // Status filter
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (t.taskTitle || t.title).toLowerCase();
        const desc = t.description.toLowerCase();
        const id = (t.taskId || t.id).toLowerCase();
        return title.includes(q) || desc.includes(q) || id.includes(q);
      }
      return true;
    });
  }, [currentPlan, filterParty, filterCategory, filterStatus, searchQuery]);

  // Copy helper
  const handleCopyText = (text: string, index: number, isSnippet: boolean = false) => {
    navigator.clipboard.writeText(text);
    if (isSnippet) {
      setCopiedSnippetIndex(index);
      setTimeout(() => setCopiedSnippetIndex(null), 2000);
    } else {
      setCopiedSectionIndex(index);
      setTimeout(() => setCopiedSectionIndex(null), 2000);
    }
  };

  // Render helpful Not Found screen if a requested shared plan cannot be found
  if (notFoundPlanId && !loading) {
    return (
      <div className="rounded-xl border border-rose-500/40 bg-[#0F172A] p-8 text-center space-y-5 max-w-2xl mx-auto my-12 shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Integration Plan Not Found</h2>
          <p className="mt-1 font-mono text-xs text-rose-300">
            Requested Plan Identifier: <span className="bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800 text-rose-200">{notFoundPlanId}</span>
          </p>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-lg mx-auto">
          The requested integration plan or guide could not be located in persistent storage. The identifier may be invalid, or the plan has not been generated yet.
        </p>
        <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3.5 text-[11px] text-slate-400 text-left space-y-1.5">
          <span className="font-semibold text-slate-300 block">Persistence & Storage Lifecycle Notice:</span>
          <div>• Plans are persisted in local container storage (<code>data/plans.json</code>) and survive server restarts.</div>
          <div>• Container re-provisioning in stateless environments resets storage to the canonical demonstration seed.</div>
          <div>• To access plans permanently across environments, export them as JSON/Markdown using the export buttons.</div>
        </div>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => {
              setNotFoundPlanId(null);
              if (onExitSharedView) onExitSharedView();
              if (plans.length > 0) setSelectedPlanId(plans[0].id);
            }}
            className="rounded-lg bg-lime-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-lime-300 transition-colors cursor-pointer shadow-sm"
          >
            View Available Plans ({plans.length})
          </button>
          <button
            onClick={() => onNavigate('overview')}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Return to Overview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* Read-Only Shared Mode Banner */}
      {isSharedReadOnly && currentPlan && (
        <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-sky-500/20 p-1.5 text-sky-300">
              <Share2 className="h-4 w-4 shrink-0" />
            </div>
            <div>
              <span className="font-bold text-white">Shareable Read-Only View: </span>
              <span className="text-sky-200">
                Viewing published integration guide & readiness plan for <strong>{currentPlan.appName}</strong>. Task status mutations are disabled in shared mode.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyShareableLink}
              className="flex items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-400/20 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-400/30 transition-all cursor-pointer"
            >
              {isLinkCopied ? <Check className="h-3.5 w-3.5 text-lime-400" /> : <Share2 className="h-3.5 w-3.5" />}
              <span>{isLinkCopied ? 'Link Copied!' : 'Copy Shareable Link'}</span>
            </button>
            {onExitSharedView && (
              <button
                onClick={onExitSharedView}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
              >
                Exit Read-Only View
              </button>
            )}
          </div>
        </div>
      )}

      {/* Page Header & Intake Bar */}
      <div className="rounded-xl border border-slate-800 bg-[#0B132B] p-6 shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-lime-500/30 bg-lime-500/10 px-2 py-0.5 text-xs font-mono font-semibold text-lime-400">
                Step 4: Integration Readiness Planner
              </span>
              <span className="rounded-md border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-xs font-mono text-slate-300">
                CPM Critical Path Engine
              </span>
              {currentPlan?.storageInfo && (
                <span
                  title={currentPlan.storageInfo.persistenceNote}
                  className={`rounded-md border px-2 py-0.5 text-xs font-mono ${
                    currentPlan.storageInfo.storageType === 'local_file_json'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                  }`}
                >
                  Storage: {currentPlan.storageInfo.storageType === 'local_file_json' ? 'Local JSON (data/plans.json) • Survives Server Restart' : 'In-Memory'}
                </span>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
              Integration Readiness Planner & Implementation Guide
            </h1>
            <p className="mt-1 text-sm text-slate-300 max-w-3xl">
              Converts live investigation evidence into an actionable task dependency graph,
              responsibility matrix, timeline estimate, risk register, and a 14-section engineering guide.
            </p>
          </div>

          {/* Investigation Selector & Generator Action (Hidden in Shared Read-Only View) */}
          {!isSharedReadOnly ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#1C2541]/80 px-3 py-1.5">
                <label htmlFor="inv-select" className="text-xs font-medium text-slate-400">
                  Investigated Target:
                </label>
                <select
                  id="inv-select"
                  value={selectedInvestigationId}
                  onChange={(e) => {
                    const targetId = e.target.value;
                    setSelectedInvestigationId(targetId);
                    const matchingPlan = plans.find(
                      (p) => p.investigationId === targetId || p.id === `plan_${targetId}`
                    );
                    if (matchingPlan) {
                      setSelectedPlanId(matchingPlan.id);
                    }
                  }}
                  className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
                >
                  <option value="inv_discord_demo" className="bg-[#1C2541] text-white">
                    Discord (OAuth 2.0 PKCE • 4 Claims)
                  </option>
                  <option value="inv_stripe_01" className="bg-[#1C2541] text-white">
                    Stripe Connect (OAuth 2.0 Web)
                  </option>
                  <option value="inv_slack_02" className="bg-[#1C2541] text-white">
                    Slack App Directory (OAuth 2.0 + Scopes)
                  </option>
                  {investigations
                    .filter(
                      (i) =>
                        i.id !== 'inv_discord_demo' &&
                        i.id !== 'inv_stripe_01' &&
                        i.id !== 'inv_slack_02'
                    )
                    .map((inv) => (
                      <option key={inv.id} value={inv.id} className="bg-[#1C2541] text-white">
                        {inv.appName} ({inv.authMethod})
                      </option>
                    ))}
                </select>
              </div>

              <button
                onClick={() => handleGeneratePlan(selectedInvestigationId)}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 rounded-lg bg-lime-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-lime-300 disabled:opacity-50 cursor-pointer transition-all shadow-sm"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Generating Plan...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate / Update Plan
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-mono text-sky-300">
                Plan: {currentPlan?.appName} ({currentPlan?.id})
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {currentPlan ? (
        <>
          {/* Top 4 Metric Cards (Effort, External Wait, Elapsed, Responsibility) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Hands-on Dev Effort */}
            <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Engineering Effort
                </span>
                <Clock className="h-4 w-4 text-lime-400" />
              </div>
              <div className="mt-2 text-xl font-bold text-white">
                {currentPlan.effort.handsOnDevHoursMin} – {currentPlan.effort.handsOnDevHoursMax} hrs
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Active dev tasks ({currentPlan.effort.assumedProductiveHoursPerDay || 6}h daily velocity)
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono text-lime-400">
                <span>Critical Path: {currentPlan.criticalPathHours}h</span>
                <span className="text-slate-600">•</span>
                <span>{currentPlan.criticalPathTaskIds.length} sequential steps</span>
              </div>
            </div>

            {/* 2. External Waiting Time */}
            <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  External Waiting Time
                </span>
                <FolderLock className="h-4 w-4 text-sky-400" />
              </div>
              <div className="mt-2 text-xl font-bold text-white truncate">
                {currentPlan.effort.isExternalWaitDocumented
                  ? `${currentPlan.effort.externalWaitDaysMin} – ${currentPlan.effort.externalWaitDaysMax} days`
                  : 'Undocumented'}
              </div>
              <p className="mt-1 text-xs text-slate-400 truncate">
                {currentPlan.effort.externalWaitDaysLabel}
              </p>
              {currentPlan.effort.conditionalVerificationNote && (
                <p className="mt-1 text-[11px] text-amber-300/90 leading-tight">
                  {currentPlan.effort.conditionalVerificationNote}
                </p>
              )}
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono">
                {currentPlan.effort.isExternalWaitDocumented ? (
                  <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-sky-300 border border-sky-500/20">
                    Vendor SLA Verified
                  </span>
                ) : (
                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-300 border border-amber-500/20">
                    Unknown Waiting Period
                  </span>
                )}
              </div>
            </div>

            {/* 3. Total Elapsed Timeline */}
            <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total Elapsed Time
                </span>
                <Layers className="h-4 w-4 text-purple-400" />
              </div>
              <div className="mt-2 text-xl font-bold text-white">
                {currentPlan.effort.totalElapsedDaysMin} – {currentPlan.effort.totalElapsedDaysMax} days
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Parallel tracks + external approval gates
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono text-purple-300">
                <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] border border-purple-500/30">
                  Estimated (Not Guaranteed)
                </span>
              </div>
            </div>

            {/* 4. Responsibility Matrix Split */}
            <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Responsibility Split
                </span>
                <Bot className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-bold text-emerald-400">
                  {currentPlan.responsibilityMatrix.agentPreparedCount}
                </span>
                <span className="text-xs text-slate-400">Agent</span>
                <span className="text-slate-600">/</span>
                <span className="text-xl font-bold text-sky-400">
                  {currentPlan.responsibilityMatrix.humanRequiredCount}
                </span>
                <span className="text-xs text-slate-400">Human</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>Done: {currentPlan.responsibilityMatrix.completedCount}</span>
                <span className="text-rose-400">
                  Blocked: {currentPlan.responsibilityMatrix.blockedCount}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs (Task Board, Dependency Graph, Risk Register, Implementation Guide) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab('matrix')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'matrix'
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <ListTodo className="h-4 w-4 text-lime-400" />
                <span>Task Matrix ({currentPlan.tasks.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('graph')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'graph'
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <GitBranch className="h-4 w-4 text-lime-400" />
                <span>Dependency Graph & Critical Path</span>
              </button>

              <button
                onClick={() => setActiveTab('risks')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'risks'
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <span>Risk Register ({currentPlan.risks.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('guide')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'guide'
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <BookOpen className="h-4 w-4 text-sky-400" />
                <span>Implementation Guide (14 Sections)</span>
              </button>
            </div>

            {/* Export Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyShareableLink}
                className="flex items-center gap-1.5 rounded-lg border border-lime-500/40 bg-lime-500/10 px-2.5 py-1.5 text-xs font-medium text-lime-300 hover:bg-lime-500/20 hover:text-lime-200 transition-all cursor-pointer shadow-sm"
              >
                {isLinkCopied ? <Check className="h-3.5 w-3.5 text-lime-400" /> : <Share2 className="h-3.5 w-3.5" />}
                <span>{isLinkCopied ? 'Link Copied!' : 'Copy Shareable Link'}</span>
              </button>

              <a
                href={`/api/plans/${currentPlan.id}/export?format=markdown`}
                download={`${currentPlan.appName.toLowerCase()}_integration_plan.md`}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Markdown</span>
              </a>

              <a
                href={`/api/plans/${currentPlan.id}/export?format=json`}
                download={`${currentPlan.appName.toLowerCase()}_integration_plan.json`}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export JSON</span>
              </a>
            </div>
          </div>

          {/* TAB 1: TASK MATRIX & BOARD */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#0F172A] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search tasks, descriptions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="rounded-md border border-slate-700 bg-[#1C2541] pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-lime-500 focus:outline-none w-48 sm:w-60"
                    />
                  </div>

                  {/* Responsible Party Filter */}
                  <select
                    value={filterParty}
                    onChange={(e) => setFilterParty(e.target.value as any)}
                    className="rounded-md border border-slate-700 bg-[#1C2541] px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Ownership</option>
                    <option value="agent_prepared">Agent-Prepared Only</option>
                    <option value="human_required">Human-Required Only</option>
                  </select>

                  {/* Category Filter */}
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="rounded-md border border-slate-700 bg-[#1C2541] px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All 12 Categories</option>
                    <option value="application_registration">Application Registration</option>
                    <option value="oauth_configuration">OAuth Configuration</option>
                    <option value="redirect_uri_setup">Redirect URI Setup</option>
                    <option value="scope_configuration">Scope Configuration</option>
                    <option value="administrator_approval">Administrator Approval</option>
                    <option value="external_provider_verification">Provider Verification</option>
                    <option value="resource_access_configuration">Resource Access</option>
                    <option value="token_lifecycle_implementation">Token Lifecycle</option>
                    <option value="backend_integration">Backend Integration</option>
                    <option value="security_validation">Security Validation</option>
                    <option value="functional_testing">Functional Testing</option>
                    <option value="production_readiness">Production Readiness</option>
                  </select>

                  {/* Status Filter */}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="rounded-md border border-slate-700 bg-[#1C2541] px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>

                <div className="text-xs text-slate-400">
                  Showing <span className="font-semibold text-white">{filteredTasks.length}</span> of{' '}
                  <span className="font-semibold text-white">{currentPlan.tasks.length}</span> tasks
                </div>
              </div>

              {/* Task Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTasks.map((task) => {
                  const isAgent = task.responsibleParty === 'agent_prepared';
                  const isCritical = task.isCriticalPath;
                  const isBlocked = task.status === 'blocked';
                  const isDone = task.status === 'completed';

                  return (
                    <div
                      key={task.taskId || task.id}
                      className={`flex flex-col justify-between rounded-xl border p-4.5 transition-all shadow-sm ${
                        isCritical
                          ? 'border-lime-500/50 bg-[#0F172A] ring-1 ring-lime-500/20'
                          : isBlocked
                          ? 'border-rose-500/40 bg-rose-500/5'
                          : isDone
                          ? 'border-slate-800 bg-[#0B132B]/60 opacity-90'
                          : 'border-slate-800 bg-[#0F172A] hover:border-slate-700'
                      }`}
                    >
                      <div>
                        {/* Header: ID, Category & Badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[11px] text-slate-400 font-semibold">
                              {task.taskId || task.id}
                            </span>
                            <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 font-medium">
                              {task.functionalCategory?.replace(/_/g, ' ') || task.category}
                            </span>
                            {task.provenance && (
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider border ${
                                  task.provenance === 'PROVIDER_DOCUMENTED'
                                    ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                                    : task.provenance === 'GENERIC_ENGINEERING_RECOMMENDATION'
                                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                                    : task.provenance === 'PROJECT_ASSUMPTION'
                                    ? 'border-purple-500/40 bg-purple-500/10 text-purple-300'
                                    : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                                }`}
                              >
                                {task.provenance === 'PROVIDER_DOCUMENTED'
                                  ? 'Provider Documented'
                                  : task.provenance === 'GENERIC_ENGINEERING_RECOMMENDATION'
                                  ? 'Generic Recommendation'
                                  : task.provenance === 'PROJECT_ASSUMPTION'
                                  ? 'Project Assumption'
                                  : 'Unverified Dependency'}
                              </span>
                            )}
                            {isCritical && (
                              <span className="rounded border border-lime-500/40 bg-lime-500/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-lime-400 uppercase tracking-wider">
                                Critical Path
                              </span>
                            )}
                          </div>

                          {/* Ownership Badge */}
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${
                              isAgent
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                : 'border-sky-500/30 bg-sky-500/10 text-sky-400'
                            }`}
                          >
                            {isAgent ? (
                              <>
                                <Bot className="h-3 w-3" />
                                <span>Agent-Prepared</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-3 w-3" />
                                <span>Human-Required</span>
                              </>
                            )}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <h3 className="mt-2 text-sm font-bold text-white leading-snug">
                          {task.taskTitle || task.title}
                        </h3>
                        <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                          {task.description}
                        </p>

                        {/* Supporting Claim Chips */}
                        {task.supportingClaimIds && task.supportingClaimIds.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] text-slate-400">Evidence:</span>
                            {task.supportingClaimIds.map((claimId) => (
                              <span
                                key={claimId}
                                onClick={() => setSelectedClaimDetail(claimId)}
                                className="cursor-pointer rounded border border-lime-500/30 bg-lime-500/10 px-1.5 py-0.5 text-[10px] font-mono text-lime-300 hover:bg-lime-500/20 transition-colors"
                              >
                                {claimId}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Blocker Alert */}
                        {isBlocked && (
                          <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-300">
                            <AlertOctagon className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                            <div>
                              <span className="font-semibold">Blocker: </span>
                              {task.blockerInfo?.blockedReason || task.blockerReason || 'Prerequisite missing.'}
                            </div>
                          </div>
                        )}

                        {/* Criteria & Inputs */}
                        <div className="mt-3 border-t border-slate-800/80 pt-2 text-[11px] text-slate-400 space-y-1">
                          {task.completionCriteria && (
                            <div>
                              <span className="font-semibold text-slate-300">Completion Criteria: </span>
                              <span>{task.completionCriteria}</span>
                            </div>
                          )}
                          {task.dependencies && task.dependencies.length > 0 && (
                            <div className="flex items-center gap-1 font-mono text-[10px]">
                              <span className="text-slate-400">Depends on:</span>
                              <span className="text-amber-300">{task.dependencies.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer Controls: Estimated Effort + Status Dropdown */}
                      <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
                        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          <span>{task.estimatedHours || 2}h effort</span>
                          {task.externalWaitDays ? (
                            <span className="text-amber-400">({task.externalWaitDays} wait)</span>
                          ) : null}
                        </div>

                        {/* Interactive Status Switcher (or Read-Only pill in shared mode) */}
                        {isSharedReadOnly ? (
                          <span
                            className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                              task.status === 'completed'
                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                                : task.status === 'blocked'
                                ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                                : task.status === 'in_progress'
                                ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                                : 'border-slate-700 bg-slate-800 text-slate-300'
                            }`}
                          >
                            {task.status.toUpperCase().replace('_', ' ')}
                          </span>
                        ) : (
                          <select
                            value={task.status}
                            onChange={(e) =>
                              handleTaskStatusChange(task.taskId || task.id, e.target.value as TaskStatus)
                            }
                            className={`rounded-md border px-2 py-1 text-xs font-semibold focus:outline-none cursor-pointer transition-colors ${
                              task.status === 'completed'
                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                                : task.status === 'blocked'
                                ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                                : task.status === 'in_progress'
                                ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                                : 'border-slate-700 bg-slate-800 text-slate-300'
                            }`}
                          >
                            <option value="pending" className="bg-[#1C2541] text-slate-300">
                              Pending
                            </option>
                            <option value="in_progress" className="bg-[#1C2541] text-sky-300">
                              In Progress
                            </option>
                            <option value="completed" className="bg-[#1C2541] text-emerald-300">
                              Completed
                            </option>
                            <option value="blocked" className="bg-[#1C2541] text-rose-300">
                              Blocked
                            </option>
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: VISUAL DEPENDENCY GRAPH & CRITICAL PATH */}
          {activeTab === 'graph' && (
            <div className="space-y-6">
              {/* Critical Path Callout Banner */}
              <div className="rounded-xl border border-lime-500/40 bg-gradient-to-r from-lime-500/10 via-slate-900 to-slate-900 p-5 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-lime-400 text-slate-950 font-bold">
                      CPM
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">
                        Mathematically Derived Critical Path
                      </h2>
                      <p className="text-xs text-slate-300">
                        {currentPlan.criticalPathTaskIds.length} sequential tasks dictate minimum integration turnaround time of{' '}
                        <span className="font-bold text-lime-400 font-mono">
                          {currentPlan.criticalPathHours} developer hours
                        </span>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-mono text-slate-300">
                      Zero Slack Sequence
                    </span>
                  </div>
                </div>

                {/* Critical Path Flow Line */}
                <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                  {currentPlan.criticalPathTaskIds.map((id, index) => {
                    const task = currentPlan.tasks.find((t) => (t.taskId || t.id) === id);
                    if (!task) return null;

                    return (
                      <React.Fragment key={id}>
                        <div className="flex items-center gap-1.5 rounded-lg border border-lime-500/60 bg-lime-500/10 px-3 py-1.5 shadow-sm">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-lime-400 text-[10px] font-bold text-slate-950">
                            {index + 1}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-white truncate max-w-[160px]">
                              {task.taskTitle || task.title}
                            </div>
                            <div className="text-[10px] font-mono text-lime-400">
                              {task.earliestStartHour}h – {task.earliestFinishHour}h ({task.estimatedHours || 2}h)
                            </div>
                          </div>
                        </div>
                        {index < currentPlan.criticalPathTaskIds.length - 1 && (
                          <ArrowRight className="h-4 w-4 text-lime-400 shrink-0" />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Full Dependency Graph Visual Tracks */}
              <div className="rounded-xl border border-slate-800 bg-[#0B132B] p-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Full Integration Dependency Architecture (DAG)
                  </h3>
                  <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-full bg-lime-400 inline-block" />
                      Critical Path
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-full bg-sky-400 inline-block" />
                      Human Approval Gate
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-600 inline-block" />
                      Parallel Task
                    </span>
                  </div>
                </div>

                {/* Render Task Graph Rows */}
                <div className="mt-6 space-y-4">
                  {currentPlan.tasks.map((task, i) => {
                    const isCritical = task.isCriticalPath;
                    const hasWait = Boolean(task.externalWaitDays);
                    const isHuman = task.responsibleParty === 'human_required';

                    return (
                      <div
                        key={task.taskId || task.id}
                        className={`rounded-lg border p-3.5 transition-all ${
                          isCritical
                            ? 'border-lime-500/60 bg-lime-500/5 ring-1 ring-lime-500/20'
                            : isHuman && hasWait
                            ? 'border-amber-500/40 bg-amber-500/5'
                            : 'border-slate-800 bg-[#0F172A]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <span className="font-mono text-xs font-bold text-slate-400 mt-0.5">
                              #{i + 1}
                            </span>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-white">
                                  {task.taskTitle || task.title}
                                </span>
                                <span className="font-mono text-[10px] text-slate-400">
                                  [{task.taskId || task.id}]
                                </span>
                                {isCritical && (
                                  <span className="rounded bg-lime-400/20 px-1.5 py-0.2 text-[10px] font-mono font-bold text-lime-400 border border-lime-400/30">
                                    CRITICAL PATH (SLACK: 0h)
                                  </span>
                                )}
                                {hasWait && (
                                  <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-mono font-bold text-amber-300 border border-amber-500/30">
                                    EXTERNAL GATE: {task.externalWaitDays}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-slate-400 max-w-2xl">
                                {task.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-auto shrink-0 font-mono text-xs">
                            <div className="text-right">
                              <div className="text-white font-semibold">
                                {task.earliestStartHour}h – {task.earliestFinishHour}h
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Slack: {task.slack}h
                              </div>
                            </div>

                            <span
                              className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                                task.status === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : task.status === 'blocked'
                                  ? 'bg-rose-500/20 text-rose-400'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {task.status.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Dependencies Connection Pills */}
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-2 text-[11px]">
                          <span className="text-slate-400 font-medium">Prerequisites:</span>
                          {task.dependencies && task.dependencies.length > 0 ? (
                            task.dependencies.map((depId) => {
                              const depTask = currentPlan.tasks.find((t) => (t.taskId || t.id) === depId);
                              return (
                                <span
                                  key={depId}
                                  className="rounded border border-slate-700 bg-slate-800/80 px-2 py-0.5 font-mono text-[10px] text-slate-300"
                                >
                                  &larr; {depTask ? depTask.taskTitle || depTask.title : depId}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-slate-400 font-mono text-[10px]">
                              Independent (Can initiate immediately)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RISK REGISTER */}
          {activeTab === 'risks' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Integration Risk & Governance Register
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Identifies regulatory approvals, token rotation hazards, rate limits, and permission boundaries.
                    </p>
                  </div>
                  <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-mono text-amber-300">
                    {currentPlan.risks.length} Risks Monitored
                  </span>
                </div>
              </div>

              {/* Risks Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0B132B]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-900/80 font-mono uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Risk & Root Cause</th>
                      <th className="px-4 py-3 font-semibold">Impact</th>
                      <th className="px-4 py-3 font-semibold">Likelihood</th>
                      <th className="px-4 py-3 font-semibold">Supporting Evidence</th>
                      <th className="px-4 py-3 font-semibold">Mitigation Strategy</th>
                      <th className="px-4 py-3 font-semibold">Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {currentPlan.risks.map((risk) => (
                      <tr key={risk.riskId} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-4 py-3.5 max-w-xs">
                          <div className="font-bold text-white">{risk.risk}</div>
                          <div className="mt-1 text-slate-300 text-[11px] leading-relaxed">
                            {risk.cause}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                              risk.impact === 'critical'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : risk.impact === 'high'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {risk.impact}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`rounded px-2 py-0.5 font-mono text-[10px] font-medium uppercase ${
                              risk.likelihood === 'high'
                                ? 'text-amber-400'
                                : risk.likelihood === 'medium'
                                ? 'text-slate-300'
                                : 'text-slate-400'
                            }`}
                          >
                            {risk.likelihood}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 max-w-xs text-slate-300 text-[11px]">
                          <div className="italic bg-slate-900/80 p-2 rounded border border-slate-800">
                            "{risk.evidence}"
                          </div>
                          {risk.supportingClaimId && (
                            <span className="mt-1 inline-block font-mono text-[10px] text-lime-400">
                              Claim: {risk.supportingClaimId}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 max-w-xs text-slate-200 text-[11px] leading-relaxed">
                          {risk.mitigation}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-300">
                          {risk.owner}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: IMPLEMENTATION GUIDE (14 SECTIONS) */}
          {activeTab === 'guide' && currentPlan.guide && (
            <div className="space-y-6">
              {/* Guide Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-800 bg-[#0F172A] p-4.5">
                <div>
                  <h3 className="text-base font-bold text-white">
                    {currentPlan.appName} Integration Engineering Guide
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Comprehensive 14-section developer reference linking technical instructions directly to documented claims.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRegenerateGuide}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                    <span>Regenerate with Latest Evidence</span>
                  </button>
                </div>
              </div>

              {/* 14 Sections Accordion / Continuous View */}
              <div className="space-y-4">
                {currentPlan.guide.sections.map((sec, index) => {
                  const isExpanded = expandedGuideSection === sec.sectionNumber;

                  return (
                    <div
                      key={sec.id}
                      className="rounded-xl border border-slate-800 bg-[#0B132B] overflow-hidden shadow-sm"
                    >
                      <button
                        onClick={() =>
                          setExpandedGuideSection(isExpanded ? null : sec.sectionNumber)
                        }
                        className="w-full flex items-center justify-between p-4.5 text-left bg-[#0F172A]/70 hover:bg-[#0F172A] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 font-mono text-xs font-bold text-lime-400 border border-slate-700">
                            {sec.sectionNumber}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-white">{sec.title}</h4>
                            <p className="text-xs text-slate-400">{sec.summary}</p>
                          </div>
                        </div>

                        <ChevronDown
                          className={`h-4 w-4 text-slate-400 transition-transform ${
                            isExpanded ? 'rotate-180 text-lime-400' : ''
                          }`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="p-5 border-t border-slate-800 space-y-4">
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {sec.contentMarkdown}
                          </p>

                          {/* Technical Instructions List */}
                          {sec.technicalInstructions && sec.technicalInstructions.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-slate-800/80">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Technical Specifications & Actions
                              </h5>
                              <div className="space-y-2">
                                {sec.technicalInstructions.map((ins, iIdx) => (
                                  <div
                                    key={iIdx}
                                    className="rounded-lg border border-slate-800 bg-[#0F172A] p-3 text-xs"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-start gap-2">
                                        <span className="font-mono text-lime-400 font-bold shrink-0">
                                          [{ins.step}]
                                        </span>
                                        <span className="text-slate-200">{ins.instruction}</span>
                                      </div>

                                      <span
                                        className={`rounded px-1.5 py-0.5 text-[10px] font-mono shrink-0 uppercase tracking-wider border ${
                                          ins.provenance === 'OFFICIALLY_DOCUMENTED'
                                            ? 'bg-lime-500/10 text-lime-400 border-lime-500/30'
                                            : ins.provenance === 'INDEPENDENTLY_CORROBORATED'
                                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                                            : ins.provenance === 'GENERIC_ENGINEERING_RECOMMENDATION'
                                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                            : ins.provenance === 'PROJECT_ASSUMPTION'
                                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                            : 'bg-slate-800 text-slate-400 border-slate-700'
                                        }`}
                                      >
                                        {ins.provenance
                                          ? ins.provenance.replace(/_/g, ' ')
                                          : ins.isRecommendation
                                          ? 'Generic Best Practice'
                                          : 'Documented Requirement'}
                                      </span>
                                    </div>

                                    {ins.evidenceText && (
                                      <div className="mt-2 text-[11px] text-slate-400 italic bg-slate-900/80 p-2 rounded border border-slate-800">
                                        Evidence Excerpt: "{ins.evidenceText}"
                                        {ins.supportingClaimId && (
                                          <span className="ml-2 not-italic text-lime-400 font-mono text-[10px]">
                                            ({ins.supportingClaimId})
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Code Snippet */}
                          {sec.codeSnippet && (
                            <div className="pt-2">
                              <div className="flex items-center justify-between rounded-t-lg bg-slate-900 px-3.5 py-2 border-t border-x border-slate-800">
                                <span className="text-xs font-mono text-slate-400">
                                  {sec.codeSnippet.caption || sec.codeSnippet.language}
                                </span>
                                <button
                                  onClick={() =>
                                    handleCopyText(sec.codeSnippet!.code, index, true)
                                  }
                                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
                                >
                                  {copiedSnippetIndex === index ? (
                                    <>
                                      <Check className="h-3.5 w-3.5 text-lime-400" />
                                      <span className="text-lime-400">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3.5 w-3.5" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <pre className="overflow-x-auto rounded-b-lg border border-slate-800 bg-[#080D1A] p-3.5 text-xs font-mono text-slate-300">
                                <code>{sec.codeSnippet.code}</code>
                              </pre>
                            </div>
                          )}

                          {/* Warnings */}
                          {sec.warnings && sec.warnings.length > 0 && (
                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 space-y-1">
                              <div className="font-bold flex items-center gap-1.5">
                                <AlertTriangle className="h-4 w-4" />
                                <span>Operational Warning</span>
                              </div>
                              {sec.warnings.map((w, wIdx) => (
                                <p key={wIdx} className="text-amber-200/90 pl-5">
                                  {w}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex h-96 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center">
          <ListTodo className="h-10 w-10 text-slate-500" />
          <p className="mt-3 text-sm font-semibold text-slate-300">No integration plan generated</p>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            Select an investigated target from the dropdown above and click "Generate / Update Plan" to create tasks, dependencies, and guide.
          </p>
        </div>
      )}
    </div>
  );
};
