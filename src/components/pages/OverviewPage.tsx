/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  SearchCode,
  Compass,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  Clock,
  DollarSign,
  AlertTriangle,
  BookOpen,
  Info,
  ChevronRight,
  Sparkles,
  Layers,
  CheckCircle2,
  Lock
} from 'lucide-react';
import {
  NavigationPage,
  ProviderRecord,
  InvestigationDraft,
  ReadinessDimension,
  IntegrationGuide
} from '../../shared/types.ts';

interface OverviewPageProps {
  onNavigate: (page: NavigationPage) => void;
  providers: ProviderRecord[];
  investigations: InvestigationDraft[];
  dimensions: ReadinessDimension[];
  guides: IntegrationGuide[];
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  onNavigate,
  providers,
  investigations,
  dimensions,
  guides,
}) => {
  return (
    <div className="space-y-6 pb-12">
      {/* Sample Data Disclaimer Banner */}
      <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
        <div className="flex items-center gap-2.5">
          <Info className="h-4 w-4 shrink-0 text-amber-400" />
          <span>
            <strong className="font-semibold text-amber-300">Demonstration Environment Notice:</strong> All provider profiles, investigation drafts, and readiness values shown below are demonstration sample records only, clearly distinguished from independently verified provider evidence. No actual user credentials or external API connections are utilized.
          </span>
        </div>
        <span className="hidden sm:inline-block rounded border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-mono uppercase text-amber-300">
          Sample Records
        </span>
      </div>

      {/* Hero Welcome & Primary Action Section */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-[#111C35] via-[#0D1527] to-[#0A0F1D] p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-xs font-semibold text-lime-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>OAuth & Integration Governance Platform</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
            Know the work before you commit to the integration.
          </h2>

          <p className="text-sm sm:text-base leading-relaxed text-slate-300">
            OAuth and API integration readiness involves more than endpoint documentation. Understand provider-specific approval requirements, scope sensitivity, enterprise administrator dependencies, token lifecycle considerations and potential costs before engineering begins.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('investigations')}
              className="inline-flex items-center gap-2 rounded-lg bg-lime-400 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-950 hover:bg-lime-300 transition-colors shadow-lg shadow-lime-400/15"
            >
              <SearchCode className="h-4 w-4 stroke-[2.2]" />
              <span>Investigate an App</span>
              <ArrowRight className="h-4 w-4 ml-0.5" />
            </button>

            <button
              onClick={() => onNavigate('discovery')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <Compass className="h-4 w-4" />
              <span>Explore Cataloged Apps</span>
            </button>

            <button
              onClick={() => onNavigate('readiness')}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              <span>View 6 Assessment Dimensions</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Decorative Grid Accent */}
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-lime-400/5 blur-3xl pointer-events-none" />
      </div>

      {/* Grid: Integration Readiness Overview & Evidence Quality */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Six Dimensions High-Level Matrix */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-[#0F172A] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-lime-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Integration Readiness Overview
              </h3>
            </div>
            <button
              onClick={() => onNavigate('readiness')}
              className="text-xs font-medium text-lime-400 hover:underline flex items-center gap-1"
            >
              Assessment Rubric <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dimensions.slice(0, 4).map((dim) => (
              <div
                key={dim.key}
                className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-3.5 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">{dim.name}</span>
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                    Dimension
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400 line-clamp-2">
                  {dim.tagline}
                </p>
                <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Evaluation status:</span>
                  <span className="text-amber-400/90 font-medium">Calculation pending engine</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-3 text-xs text-slate-400 flex items-center justify-between">
            <span className="text-slate-400">
              Readiness is evaluated across 6 non-negotiable vectors including internal legal approvals and vendor deprecation cadence.
            </span>
            <button
              onClick={() => onNavigate('readiness')}
              className="shrink-0 ml-4 font-semibold text-slate-300 hover:text-white"
            >
              Full Rubric &rarr;
            </button>
          </div>
        </div>

        {/* Evidence Quality Overview */}
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-lime-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Evidence Quality
              </h3>
            </div>
            <span className="text-[10px] rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-400">
              Audit Grade
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Every readiness claim must be backed by official developer documentation, API schema specs, or independent audit guidelines. Initial demonstration profiles represent sample records until independently verified.
          </p>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/80 p-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-lime-400" />
                <span className="text-xs font-medium text-slate-300">Verified Official Docs (Sample Profile)</span>
              </div>
              <span className="rounded bg-lime-400/10 px-2 py-0.5 text-[11px] font-mono font-semibold text-lime-300">
                3 Sample Records
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/80 p-2.5">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-medium text-slate-300">In Review (Sample Profile)</span>
              </div>
              <span className="rounded bg-amber-400/10 px-2 py-0.5 text-[11px] font-mono font-semibold text-amber-300">
                1 Sample Record
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/80 p-2.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                <span className="text-xs font-medium text-slate-300">Identified Unknowns</span>
              </div>
              <span className="rounded bg-rose-400/10 px-2 py-0.5 text-[11px] font-mono font-semibold text-rose-300">
                6 Items Flagged
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2.5 text-[11px] text-slate-400">
            <strong className="text-slate-300">Anti-Hallucination Policy:</strong> If vendor documentation is ambiguous regarding rate limit backoff or token revocation, it is flagged as an explicit unknown.
          </div>
        </div>
      </div>

      {/* Recent Investigations Section */}
      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <SearchCode className="h-4 w-4 text-lime-400" />
              Recent Demonstration Investigations
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Sample intake records illustrating what the platform detects prior to code generation.
            </p>
          </div>
          <button
            onClick={() => onNavigate('investigations')}
            className="text-xs font-semibold text-lime-400 hover:text-lime-300 flex items-center gap-1 self-start sm:self-auto"
          >
            Open Investigation Workspace &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {investigations.map((inv) => (
            <div
              key={inv.id}
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 hover:border-slate-700 transition-colors space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{inv.appName}</span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                      Sample Intake
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 block mt-0.5">{inv.authMethod}</span>
                </div>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                  Engine Unconnected
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Detected Approval Gates:</span>
                  <span className="font-mono text-slate-200">{inv.identifiedApprovalGates.length} requirements</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Target Environment:</span>
                  <span className="text-slate-200">{inv.environmentType}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Flagged Ambiguities:</span>
                  <span className="text-rose-300">{inv.unknownQuestions.length} unknown vectors</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                <a
                  href={inv.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-lime-400 truncate max-w-[200px]"
                >
                  {inv.docUrl}
                </a>
                <button
                  onClick={() => onNavigate('investigations')}
                  className="font-medium text-lime-400 hover:underline"
                >
                  Inspect &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Access to Integration Guides */}
      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-lime-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Featured Integration Architecture Guides
            </h3>
          </div>
          <button
            onClick={() => onNavigate('guides')}
            className="text-xs font-semibold text-lime-400 hover:text-lime-300 flex items-center gap-1"
          >
            All Guides ({guides.length}) &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {guides.map((guide) => (
            <div
              key={guide.id}
              className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-lime-400">
                    {guide.providerName}
                  </span>
                  <span className="text-[10px] text-slate-400">{guide.readTime}</span>
                </div>
                <h4 className="text-xs font-semibold text-slate-100 line-clamp-2 leading-snug">
                  {guide.title}
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-3">
                  {guide.summary}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Sample Guide</span>
                <button
                  onClick={() => onNavigate('guides')}
                  className="text-xs font-medium text-lime-400 hover:underline flex items-center gap-0.5"
                >
                  Read <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
