/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  SearchCode,
  AlertTriangle,
  Info,
  Clock,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  FileSearch,
  CheckCircle2,
  Lock,
  ArrowRight,
  RefreshCw,
  Sliders,
  ExternalLink,
  BookOpen,
  Layers,
  Cpu,
  KeyRound,
  FileText,
  Building2,
  ListFilter
} from 'lucide-react';
import {
  InvestigationDraft,
  AuthMethod,
  NavigationPage,
  InvestigationPurpose,
  ClaimEvidenceStatus
} from '../../shared/types.ts';
import { validateDocUrl, deriveAppNameFromUrl, findKnownDocumentationUrl } from '../../utils/readiness.ts';

interface InvestigationsPageProps {
  investigations: InvestigationDraft[];
  onAddInvestigation: (draft: InvestigationDraft) => void;
  onNavigate: (page: NavigationPage) => void;
  onNavigateToPlanner?: (investigationId: string) => void;
}

export const InvestigationsPage: React.FC<InvestigationsPageProps> = ({
  investigations,
  onAddInvestigation,
  onNavigate,
  onNavigateToPlanner
}) => {
  const [appName, setAppName] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [isDerivedName, setIsDerivedName] = useState(false);
  const [description, setDescription] = useState('');
  const [investigationPurpose, setInvestigationPurpose] = useState<InvestigationPurpose>('both');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('OAuth 2.0 PKCE');
  const [environmentType, setEnvironmentType] = useState<'Production' | 'Staging / Sandbox' | 'Internal Tool'>('Production');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedInvestigation, setSelectedInvestigation] = useState<InvestigationDraft | null>(
    investigations.length > 0 ? investigations[0] : null
  );
  const [activeSectionTab, setActiveSectionTab] = useState<'all' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'>('all');

  // Check if current app name matches a known registry provider
  const knownRegistryMatch = React.useMemo(() => {
    if (!appName.trim() || docUrl.trim()) return null;
    return findKnownDocumentationUrl(appName.trim());
  }, [appName, docUrl]);

  // Handle URL change with auto-derivation of provisional app name
  const handleDocUrlChange = (val: string) => {
    setDocUrl(val);
    if (!appName.trim() || isDerivedName) {
      const derived = deriveAppNameFromUrl(val);
      if (derived && derived !== 'Unknown Provider') {
        setAppName(derived);
        setIsDerivedName(true);
      }
    }
  };

  const handleAppNameChange = (val: string) => {
    setAppName(val);
    setIsDerivedName(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const hasName = Boolean(appName.trim());
    const hasUrl = Boolean(docUrl.trim());

    if (!hasName && !hasUrl) {
      setValidationError('Please specify an Application Name OR a Documentation Website URL.');
      return;
    }

    let resolvedDocUrl = docUrl.trim();
    let resolvedAppName = appName.trim();
    let provenance: 'verified_registry' | 'inferred_from_url' | 'user_supplied' = 'user_supplied';

    if (hasUrl) {
      const urlCheck = validateDocUrl(docUrl);
      if (!urlCheck.isValid) {
        setValidationError(urlCheck.error || 'Please enter a valid documentation URL.');
        return;
      }
      resolvedDocUrl = urlCheck.normalized || docUrl.trim();
      if (!hasName) {
        resolvedAppName = deriveAppNameFromUrl(resolvedDocUrl);
        provenance = 'inferred_from_url';
      } else {
        provenance = 'user_supplied';
      }
    } else if (hasName) {
      const known = findKnownDocumentationUrl(resolvedAppName);
      if (known) {
        resolvedAppName = known.officialName;
        resolvedDocUrl = known.docUrl;
        provenance = 'verified_registry';
      } else {
        setValidationError(
          `Official documentation URL for unfamiliar app "${resolvedAppName}" could not be confidently identified in the verified registry. Please provide the official developer documentation URL to proceed with live investigation.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    setProgressMsg('Retrieving official developer documentation with SSRF protection...');

    try {
      const res = await fetch('/api/investigations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: resolvedAppName,
          docUrl: resolvedDocUrl,
          authMethod,
          environmentType,
          investigationPurpose,
          description: description.trim() || undefined,
          urlProvenance: provenance,
          isDerivedName
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || errorData.message || 'Investigation engine returned an error');
      }

      const json = await res.json();
      const newRecord: InvestigationDraft = json.data;
      onAddInvestigation(newRecord);
      setSelectedInvestigation(newRecord);

      // Reset form fields
      setAppName('');
      setDocUrl('');
      setDescription('');
      setIsDerivedName(false);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Error executing live investigation');
    } finally {
      setIsSubmitting(false);
      setProgressMsg(null);
    }
  };

  const findings = selectedInvestigation?.findings;
  const evidenceSummary = selectedInvestigation?.evidenceSummary;

  const renderEvidenceBadge = (status: ClaimEvidenceStatus) => {
    switch (status) {
      case 'official_verified':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
            <CheckCircle2 className="h-3 w-3" /> Official Verified
          </span>
        );
      case 'independently_corroborated':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-lime-500/10 border border-lime-500/30 px-2 py-0.5 text-[10px] font-medium text-lime-300">
            <CheckCircle2 className="h-3 w-3" /> Corroborated
          </span>
        );
      case 'estimated':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-medium text-amber-300">
            Estimated
          </span>
        );
      case 'hypothesis':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 text-[10px] font-medium text-purple-300">
            Hypothesis
          </span>
        );
      case 'unknown':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 text-[10px] font-medium text-rose-300">
            Unknown / Undocumented
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Live Investigation Engine Active Banner */}
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 sm:p-5 text-emerald-200 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
            <h3 className="text-sm font-bold tracking-wide uppercase text-emerald-300">
              Live Investigation Engine Active
            </h3>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-300 border border-emerald-500/30">
              Connected (₹0 Runtime)
            </span>
          </div>
          <div className="text-[11px] text-emerald-300/80">
            SSRF Defense &bull; Content-Type Verification &bull; Claim-Level Audit Ledger
          </div>
        </div>
        <p className="text-xs text-emerald-100/85 leading-relaxed">
          Submit any public developer documentation URL to initiate a live integration readiness audit. The engine securely fetches documentation, parses OAuth grant types, scopes, and lifecycle constraints, and outputs a 7-section report backed by verbatim source excerpts. Undocumented architectural areas are explicitly flagged as known unknowns.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Intake Workspace Form & History */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <SearchCode className="h-4 w-4 text-lime-400" />
                Launch Live Investigation
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Analyze public documentation to discover OAuth readiness, scopes, and governance hurdles.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Flexible Intake Explainer Banner */}
              <div className="rounded-lg border border-slate-700/80 bg-slate-900/60 p-2.5 text-[11px] text-slate-300 space-y-1">
                <span className="font-semibold text-lime-400 block">Flexible Intake (Name OR Website):</span>
                <span>Enter an application name (e.g. <em>Slack</em>) OR documentation URL. For known providers, official docs are linked automatically. For URLs, the application name is inferred from the domain.</span>
              </div>

              {validationError && (
                <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Application Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-200">
                    Application Name
                  </label>
                  {isDerivedName && (
                    <span className="text-[10px] font-mono text-sky-300 bg-sky-500/10 border border-sky-500/30 px-1.5 py-0.5 rounded">
                      Inferred from URL
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => handleAppNameChange(e.target.value)}
                  placeholder="e.g. GitHub, Stripe, Discord, Slack, Airtable"
                  className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs text-white placeholder:text-slate-500 focus:border-lime-500 focus:outline-none"
                />
                {knownRegistryMatch && (
                  <span className="text-[11px] text-emerald-400 mt-1 block flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    Verified in registry: official docs linked automatically ({knownRegistryMatch.docUrl})
                  </span>
                )}
              </div>

              {/* Documentation URL */}
              <div>
                <label className="block font-semibold text-slate-200 mb-1">
                  Official Developer Documentation or Website URL
                </label>
                <input
                  type="text"
                  value={docUrl}
                  onChange={(e) => handleDocUrlChange(e.target.value)}
                  placeholder="e.g. https://discord.com/developers/docs/topics/oauth2"
                  className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs text-white placeholder:text-slate-500 focus:border-lime-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Public HTTP/HTTPS documentation endpoint. Private subnets and localhost are blocked.
                </span>
              </div>

              {/* Investigation Purpose */}
              <div>
                <label className="block font-semibold text-slate-200 mb-1">
                  Investigation Purpose
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'oauth', label: 'OAuth Flow' },
                    { id: 'api_auth', label: 'API Auth' },
                    { id: 'both', label: 'Both OAuth & API' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setInvestigationPurpose(p.id as InvestigationPurpose)}
                      className={`rounded-lg border px-2 py-2 text-[11px] font-medium text-center transition-colors ${
                        investigationPurpose === p.id
                          ? 'border-lime-400 bg-lime-400/10 text-lime-300 font-semibold'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Auth Method */}
              <div>
                <label className="block font-semibold text-slate-200 mb-1">
                  Target Authentication Protocol
                </label>
                <select
                  value={authMethod}
                  onChange={(e) => setAuthMethod(e.target.value as AuthMethod)}
                  className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs text-white focus:border-lime-500 focus:outline-none"
                >
                  <option value="OAuth 2.0 PKCE">OAuth 2.0 PKCE (Recommended for SPA & Mobile)</option>
                  <option value="OAuth 2.0 Web (Confidential)">OAuth 2.0 Web (Confidential Server Secret)</option>
                  <option value="OAuth 2.0 + Scopes">OAuth 2.0 + Scopes (Granular Consent Screen)</option>
                  <option value="OAuth 2.0 + Instance Admin">OAuth 2.0 + Instance Admin (Enterprise Multi-Tenant)</option>
                  <option value="API Key / Token">API Key / Scoped Personal Access Token</option>
                </select>
              </div>

              {/* Target Environment */}
              <div>
                <label className="block font-semibold text-slate-200 mb-1">
                  Target Deployment Environment
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Production', 'Staging / Sandbox', 'Internal Tool'] as const).map((env) => (
                    <button
                      key={env}
                      type="button"
                      onClick={() => setEnvironmentType(env)}
                      className={`rounded-lg border px-2 py-2 text-[11px] font-medium text-center transition-colors ${
                        environmentType === env
                          ? 'border-lime-400 bg-lime-400/10 text-lime-300 font-semibold'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {env}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description / Use Case */}
              <div>
                <label className="block font-semibold text-slate-200 mb-1">
                  Target Use Case or Description (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Sync customer records with backend webhook triggers"
                  className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs text-white placeholder:text-slate-500 focus:border-lime-500 focus:outline-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-lime-400 py-2.5 text-xs font-bold text-slate-950 hover:bg-lime-300 disabled:opacity-60 transition-colors shadow-md shadow-lime-400/10 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-slate-950" />
                      <span>{progressMsg || 'Executing Live Investigation...'}</span>
                    </>
                  ) : (
                    <>
                      <SearchCode className="h-4 w-4 stroke-[2.2]" />
                      <span>Run Live Investigation</span>
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-2.5 text-[11px] text-slate-400">
                <Info className="h-3 w-3 inline text-lime-400 mr-1" />
                Live crawler fetches up to 1MB of documentation, verifies SSL certificates, prevents SSRF loops, and parses token contracts.
              </div>
            </form>
          </div>

          {/* Investigation History / Saved Reports */}
          <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Saved Investigation Reports
              </span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                {investigations.length} Total
              </span>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {investigations.map((item) => {
                const isSelected = selectedInvestigation?.id === item.id;
                const statusColor =
                  item.status === 'completed'
                    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                    : item.status === 'completed_with_gaps'
                    ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                    : item.status === 'failed'
                    ? 'text-rose-400 border-rose-500/30 bg-rose-500/10'
                    : 'text-blue-400 border-blue-500/30 bg-blue-500/10';

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedInvestigation(item)}
                    className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                      isSelected
                        ? 'border-lime-500/50 bg-lime-500/5 text-white'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-white truncate">{item.appName}</span>
                      <span className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded border ${statusColor} shrink-0`}>
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                      <span className="truncate max-w-[180px]">{item.authMethod}</span>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {new Date(item.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: 7-Section Investigation Report Viewer */}
        <div className="lg:col-span-7 space-y-6">
          {selectedInvestigation ? (
            <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 shadow-sm space-y-6">
              {/* Report Header */}
              <div className="border-b border-slate-800 pb-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-white">
                        {selectedInvestigation.appName}
                      </h3>
                      <span className="rounded bg-lime-400/10 border border-lime-400/30 px-2 py-0.5 text-[10px] font-semibold text-lime-300">
                        {selectedInvestigation.status.replace(/_/g, ' ')}
                      </span>
                      {selectedInvestigation.extractionEngine && (
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                          Engine: {selectedInvestigation.extractionEngine}
                        </span>
                      )}
                      {selectedInvestigation.urlProvenance === 'verified_registry' && (
                        <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                          Source: Verified Registry
                        </span>
                      )}
                      {selectedInvestigation.urlProvenance === 'inferred_from_url' && (
                        <span className="rounded bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 text-[10px] font-mono text-sky-300">
                          Source: Inferred from Hostname
                        </span>
                      )}
                      {selectedInvestigation.urlProvenance === 'user_supplied' && (
                        <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                          Source: User-Supplied URL
                        </span>
                      )}
                    </div>

                    <a
                      href={selectedInvestigation.docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1.5 text-xs text-lime-400 hover:underline break-all"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span>{selectedInvestigation.docUrl}</span>
                    </a>
                  </div>

                  <div className="sm:text-right text-[11px] text-slate-400 space-y-0.5">
                    <div>Environment: <strong className="text-slate-200">{selectedInvestigation.environmentType}</strong></div>
                    <div>Investigation ID: <span className="font-mono text-slate-400">{selectedInvestigation.id}</span></div>
                    <div>Analyzed: <span className="text-slate-300">{new Date(selectedInvestigation.submittedAt).toLocaleString()}</span></div>
                  </div>
                </div>

                {/* Summary Note */}
                <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300 leading-relaxed">
                  {selectedInvestigation.summaryNote}
                </div>

                {selectedInvestigation.reviewTimelineNote && (
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-400" /> Review Timeline Guidance:
                    </span>
                    <span className="text-amber-300/90 font-medium">{selectedInvestigation.reviewTimelineNote}</span>
                  </div>
                )}
              </div>

              {/* Evidence & Sources KPI Bar */}
              {evidenceSummary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-center">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Claims</div>
                    <div className="text-xl font-bold text-white mt-0.5">{evidenceSummary.totalClaims}</div>
                  </div>
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Official Verified</div>
                    <div className="text-xl font-bold text-emerald-300 mt-0.5">{evidenceSummary.officialVerified}</div>
                  </div>
                  <div className="rounded-lg border border-lime-500/20 bg-lime-500/5 p-3 text-center">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-lime-400">Corroborated</div>
                    <div className="text-xl font-bold text-lime-300 mt-0.5">{evidenceSummary.corroborated}</div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-center">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Doc Coverage</div>
                    <div className="text-xl font-bold text-lime-400 mt-0.5">{evidenceSummary.documentationCoveragePercent}%</div>
                  </div>
                </div>
              )}

              {/* Retrieved Documentation Sources List */}
              {selectedInvestigation.retrievedSources && selectedInvestigation.retrievedSources.length > 0 && (
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-lime-400" /> Retrieved Documentation Sources
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {selectedInvestigation.retrievedSources.map((source, idx) => (
                      <div key={idx} className="flex flex-wrap items-center justify-between gap-2 p-2 rounded bg-slate-950/60 border border-slate-800 text-slate-300">
                        <div className="flex items-center gap-2 truncate max-w-md">
                          <span className="font-mono text-[10px] text-lime-400">[{source.status}]</span>
                          <span className="font-semibold text-white truncate">{source.title}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                          <span>{(source.byteCount / 1024).toFixed(1)} KB</span>
                          <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-lime-400 hover:underline">
                            view link &rarr;
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section Tabs Filter */}
              <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Filter Sections:</span>
                {[
                  { id: 'all', label: 'All 7 Sections' },
                  { id: 'A', label: 'A: Overview' },
                  { id: 'B', label: 'B: Protocol' },
                  { id: 'C', label: 'C: Scopes' },
                  { id: 'D', label: 'D: Governance' },
                  { id: 'E', label: 'E: Tenancy' },
                  { id: 'F', label: 'F: Lifecycle' },
                  { id: 'G', label: 'G: Claims' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSectionTab(tab.id as any)}
                    className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                      activeSectionTab === tab.id
                        ? 'bg-lime-400 text-slate-950 font-bold'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* SECTION A: Overview */}
              {(activeSectionTab === 'all' || activeSectionTab === 'A') && findings?.sectionA_Overview && (
                <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-lime-300 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-lime-400" />
                      Section A: Application & Auth Overview
                    </h4>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 font-mono">
                      Category: {findings.sectionA_Overview.category}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 space-y-1">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold">Detected Protocol</span>
                      <div className="font-semibold text-white">{findings.sectionA_Overview.authMethod}</div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 space-y-1">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold">Target Environment</span>
                      <div className="font-semibold text-white">{findings.sectionA_Overview.targetEnvironment}</div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 space-y-1">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold">Integration Complexity</span>
                      <div className="font-semibold text-amber-300">{findings.sectionA_Overview.complexity}</div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 space-y-1">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold">Dependency Risk</span>
                      <div className="font-semibold text-amber-300">{findings.sectionA_Overview.dependencyRisk}</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 mt-2">{findings.sectionA_Overview.summary}</p>
                </div>
              )}

              {/* SECTION B: Protocol & OAuth Configuration */}
              {(activeSectionTab === 'all' || activeSectionTab === 'B') && findings?.sectionB_OAuthConfig && (
                <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-lime-300 flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-lime-400" />
                      Section B: OAuth 2.0 & Protocol Configuration
                    </h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">Supported Grant Types</span>
                      <div className="flex flex-wrap gap-1.5 mt-1 font-mono text-[11px]">
                        {findings.sectionB_OAuthConfig.supportedGrantTypes?.map((gt, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-lime-300 border border-slate-700">
                            {gt}
                          </span>
                        )) || <span className="text-slate-500">Not documented</span>}
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">PKCE Requirement</span>
                      <div className="text-slate-200 mt-0.5 font-medium">{findings.sectionB_OAuthConfig.pkceRequirement || 'Unknown'}</div>
                    </div>

                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">Client Registration & Endpoints</span>
                      <div className="text-slate-200 mt-0.5">{findings.sectionB_OAuthConfig.clientRegistration || 'Self-service registration.'}</div>
                    </div>

                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">Redirect URIs</span>
                      <div className="text-slate-200 mt-0.5">{findings.sectionB_OAuthConfig.redirectUris || 'Standard HTTPS callback.'}</div>
                    </div>

                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">Client Secrets Handling</span>
                      <div className="text-slate-200 mt-0.5">{findings.sectionB_OAuthConfig.clientSecretsHandling || 'Not specified.'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION C: Scopes & Permissions Explorer */}
              {(activeSectionTab === 'all' || activeSectionTab === 'C') && findings?.sectionC_Scopes && (
                <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-lime-300 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-lime-400" />
                      Section C: Scopes & Permissions Explorer
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {findings.sectionC_Scopes.length} Scopes Documented
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {findings.sectionC_Scopes.map((scope, idx) => (
                      <div key={idx} className="rounded-lg border border-slate-800 bg-slate-950/80 p-2.5 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-lime-300 truncate">{scope.name}</span>
                          <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                            {scope.tier}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 leading-snug">{scope.description}</div>
                        <div className="text-[10px] text-slate-400">
                          Audit Gate: <strong className="text-slate-300">{scope.auditRequirement}</strong>
                        </div>
                        <div className="pt-1 flex items-center justify-between">
                          {renderEvidenceBadge(scope.evidenceStatus)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION D: Approval, Governance & Enterprise Review */}
              {(activeSectionTab === 'all' || activeSectionTab === 'D') && findings?.sectionD_Governance && (
                <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-lime-300 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-amber-400" />
                      Section D: Approval, Governance & Enterprise Review
                    </h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">App Submission Process</span>
                      <div className="text-slate-200 mt-0.5">{findings.sectionD_Governance.appSubmissionProcess || 'Not documented.'}</div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">External Review Timelines</span>
                      <div className="text-slate-200 mt-0.5">{findings.sectionD_Governance.externalReviewTimelines || 'Not documented.'}</div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">Admin Dependencies</span>
                      <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-200">
                        {findings.sectionD_Governance.adminDependencies?.map((dep, i) => (
                          <li key={i}>{dep}</li>
                        )) || <li>No explicit administrator dependencies documented.</li>}
                      </ul>
                    </div>
                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">Security Assessments (CASA / Lab Audits)</span>
                      <div className="text-slate-200 mt-0.5">{findings.sectionD_Governance.securityAssessments || 'Not documented.'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION E: Resource Access & Tenancy Model */}
              {(activeSectionTab === 'all' || activeSectionTab === 'E') && findings?.sectionE_ResourceAccess && (
                <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-lime-300 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-lime-400" />
                      Section E: Resource Access & Tenancy Model
                    </h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">Workspace vs Resource Boundary</span>
                      <div className="text-slate-200 mt-0.5">{findings.sectionE_ResourceAccess.workspaceVsResource || 'Not documented.'}</div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">Sharing & Granularity Model</span>
                      <div className="text-slate-200 mt-0.5">{findings.sectionE_ResourceAccess.sharingModel || 'Not documented.'}</div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">Access Granularity</span>
                      <div className="text-slate-200 mt-0.5">{findings.sectionE_ResourceAccess.granularity || 'Not documented.'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION F: Token Lifecycle & Operational Constraints */}
              {(activeSectionTab === 'all' || activeSectionTab === 'F') && findings?.sectionF_TokenLifecycle && (
                <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-lime-300 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-lime-400" />
                      Section F: Token Lifecycle & Operational Constraints
                    </h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">Access Token Lifespan</span>
                      <div className="text-slate-200 mt-0.5 font-medium">{findings.sectionF_TokenLifecycle.accessTokenLifespan || 'Not documented.'}</div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">Refresh Token Model</span>
                      <div className="text-slate-200 mt-0.5">{findings.sectionF_TokenLifecycle.refreshTokenModel || 'Not documented.'}</div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">Token Rotation Semantics</span>
                      <div className="text-slate-200 mt-0.5">{findings.sectionF_TokenLifecycle.tokenRotation || 'Not documented.'}</div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">Revocation Behavior (RFC 7009)</span>
                      <div className="text-slate-200 mt-0.5">{findings.sectionF_TokenLifecycle.revocationBehavior || 'Not documented.'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION G: Claim-Level Evidence Ledger & Known Unknowns */}
              {(activeSectionTab === 'all' || activeSectionTab === 'G') && (
                <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-lime-300 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-lime-400" />
                      Section G: Claim-Level Evidence Ledger & Known Unknowns
                    </h4>
                  </div>

                  {/* Claims List */}
                  {findings?.sectionG_EvidenceAndUnknowns?.claims && findings.sectionG_EvidenceAndUnknowns.claims.length > 0 ? (
                    <div className="space-y-3">
                      <div className="text-xs font-semibold text-slate-300">Extracted Evidence Claims</div>
                      {findings.sectionG_EvidenceAndUnknowns.claims.map((claim) => (
                        <div key={claim.claimId} className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 space-y-2 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono text-[10px] text-lime-400 font-bold">{claim.claimId}</span>
                            <div className="flex items-center gap-2">
                              {renderEvidenceBadge(claim.evidenceStatus)}
                              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono text-slate-400">
                                Confidence: {claim.confidence}
                              </span>
                            </div>
                          </div>
                          <div className="font-semibold text-white">{claim.claimText}</div>
                          {claim.supportingExcerpt && (
                            <div className="rounded border-l-2 border-lime-400 bg-slate-900/90 p-2 text-[11px] text-slate-300 italic font-sans">
                              &ldquo;{claim.supportingExcerpt}&rdquo;
                            </div>
                          )}
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                            <span>Applicability: <strong className="text-slate-300">{claim.applicability}</strong></span>
                            {claim.sourceUrl && (
                              <a href={claim.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-lime-400 hover:underline">
                                Source Reference &rarr;
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">No formal claims recorded.</div>
                  )}

                  {/* Flagged Known Unknowns */}
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-3 mt-4">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-rose-400" />
                      <h5 className="text-xs font-bold uppercase tracking-wider text-rose-300">
                        Flagged Unknowns & Unverified Documentation Vectors
                      </h5>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      These critical architectural vectors were not documented in the retrieved source pages and must be manually verified with provider technical support before engineering:
                    </p>
                    <div className="space-y-2 text-xs">
                      {(findings?.sectionG_EvidenceAndUnknowns?.knownUnknowns || selectedInvestigation.unknownQuestions || []).map((unk, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5 text-rose-200">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-400 mt-0.5 shrink-0" />
                          <span>{unk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Next Steps Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <button
                  onClick={() => onNavigate('discovery')}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer"
                >
                  &larr; Back to Catalogue
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigate('readiness')}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer"
                  >
                    Map to 6 Dimensions &rarr;
                  </button>

                  <button
                    onClick={() => {
                      if (selectedInvestigation) {
                        if (onNavigateToPlanner) {
                          onNavigateToPlanner(selectedInvestigation.id);
                        } else {
                          onNavigate('planner');
                        }
                      }
                    }}
                    className="rounded-lg bg-lime-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-lime-300 cursor-pointer"
                  >
                    Generate Action Planner Tasks &rarr;
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-96 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center">
              <FileSearch className="h-10 w-10 text-slate-500" />
              <p className="mt-3 text-sm font-semibold text-slate-300">No investigation selected</p>
              <p className="mt-1 text-xs text-slate-400 max-w-sm">
                Launch a live investigation using the form on the left to extract OAuth readiness, scopes, and claim-level evidence.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
