/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BookOpen,
  Clock,
  ShieldCheck,
  Search,
  ExternalLink,
  ChevronRight,
  Info,
  X,
  Code2,
  AlertTriangle,
  FileCheck,
  Share2,
  Check
} from 'lucide-react';
import { IntegrationGuide, NavigationPage } from '../../shared/types.ts';

interface GuidesPageProps {
  guides: IntegrationGuide[];
  onNavigate: (page: NavigationPage) => void;
}

export const GuidesPage: React.FC<GuidesPageProps> = ({ guides, onNavigate }) => {
  const [search, setSearch] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [activeGuide, setActiveGuide] = useState<IntegrationGuide | null>(null);
  const [copiedGuideId, setCopiedGuideId] = useState<string | null>(null);

  const providers = ['all', ...Array.from(new Set(guides.map((g) => g.providerName)))];

  const handleCopyGuideLink = async (guide: IntegrationGuide) => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      const shareUrl = `${origin}${pathname}?plan=plan_inv_discord_demo`;
      await navigator.clipboard.writeText(shareUrl);
      setCopiedGuideId(guide.id);
      setTimeout(() => setCopiedGuideId(null), 3000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const filteredGuides = guides.filter((g) => {
    if (selectedProvider !== 'all' && g.providerName !== selectedProvider) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        g.title.toLowerCase().includes(q) ||
        g.summary.toLowerCase().includes(q) ||
        g.providerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Demonstration Banner */}
      <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-xs text-slate-300">
        <div className="flex items-center gap-2.5">
          <Info className="h-4 w-4 shrink-0 text-lime-400" />
          <span>
            <strong className="text-white font-semibold">Demonstration Guide Library:</strong> Architectural patterns and compliance checklists. All guides are demonstration content curated for OAuth 2.0 evaluation.
          </span>
        </div>
        <span className="rounded bg-lime-400/10 px-2 py-0.5 text-[10px] font-mono text-lime-300 font-semibold">
          Demonstration Content
        </span>
      </div>

      {/* Search and Filters */}
      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guides by title, provider, or topic..."
              className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-400 focus:border-lime-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="h-10 rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs text-slate-200 focus:border-lime-500 focus:outline-none"
            >
              <option value="all">All Providers</option>
              {providers.filter(p => p !== 'all').map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Guide Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredGuides.map((guide) => (
          <div
            key={guide.id}
            className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0F172A] p-5 shadow-sm hover:border-slate-700 hover:bg-[#131d35] transition-all space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="rounded bg-lime-400/10 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-lime-400">
                  {guide.providerName}
                </span>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {guide.readTime}
                  </span>
                </div>
              </div>

              <h3 className="text-base font-bold text-white leading-snug">
                {guide.title}
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                {guide.summary}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400">Last updated: {guide.lastUpdated}</span>
                <span className="text-[10px] text-slate-400">Status: {guide.evidenceStatus}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyGuideLink(guide)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Copy shareable link"
                >
                  {copiedGuideId === guide.id ? <Check className="h-3.5 w-3.5 text-lime-400" /> : <Share2 className="h-3.5 w-3.5" />}
                  <span>{copiedGuideId === guide.id ? 'Copied!' : 'Share'}</span>
                </button>
                <button
                  onClick={() => setActiveGuide(guide)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-lime-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-lime-300 transition-colors cursor-pointer"
                >
                  <span>Open Guide</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Guide Reader Modal */}
      {activeGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700 bg-[#0F172A] p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-lime-400/10 px-2 py-0.5 text-[10px] font-mono uppercase font-semibold text-lime-400">
                    {activeGuide.providerName}
                  </span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                    Demonstration Guide
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mt-2 leading-tight">{activeGuide.title}</h2>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>Last Updated: {activeGuide.lastUpdated}</span>
                  <span>&bull;</span>
                  <span>{activeGuide.readTime}</span>
                </div>
              </div>
              <button
                onClick={() => setActiveGuide(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 text-xs text-slate-300 leading-relaxed">
              <strong className="text-white">Executive Summary:</strong> {activeGuide.summary}
            </div>

            {/* Guide Sections */}
            <div className="space-y-6 text-xs leading-relaxed">
              {activeGuide.sections.map((section, idx) => (
                <div key={idx} className="space-y-2.5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-lime-400" />
                    {section.title}
                  </h3>
                  <p className="text-slate-300">{section.content}</p>

                  {section.codeSnippet && (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono text-[11px] text-lime-300 overflow-x-auto">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[10px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Code2 className="h-3 w-3 text-lime-400" />
                          <span>Code Implementation Pattern</span>
                        </div>
                        <span>TypeScript / Node.js</span>
                      </div>
                      <pre className="whitespace-pre">{section.codeSnippet}</pre>
                    </div>
                  )}

                  {section.warning && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                      <div>
                        <strong className="text-amber-300">Architectural Warning:</strong> {section.warning}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <span className="text-[11px] text-slate-400">
                Guide content is verified against public vendor RFC specifications.
              </span>
              <button
                onClick={() => setActiveGuide(null)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
