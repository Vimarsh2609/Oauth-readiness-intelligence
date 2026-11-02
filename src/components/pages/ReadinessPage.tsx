/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Gauge,
  Clock,
  DollarSign,
  Users,
  ShieldAlert,
  FileCheck2,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { ReadinessDimension, ProviderRecord, DimensionKey, NavigationPage } from '../../shared/types.ts';
import { evaluateDimensionEvidence } from '../../utils/readiness.ts';

interface ReadinessPageProps {
  dimensions: ReadinessDimension[];
  providers: ProviderRecord[];
  onNavigate: (page: NavigationPage) => void;
}

export const ReadinessPage: React.FC<ReadinessPageProps> = ({
  dimensions,
  providers,
  onNavigate
}) => {
  const [selectedProviderSlug, setSelectedProviderSlug] = useState<string>('linear');
  const [selectedDimensionKey, setSelectedDimensionKey] = useState<DimensionKey>('technical_effort');

  const selectedProvider = providers.find((p) => p.slug === selectedProviderSlug) || providers[0];
  const activeDimension = dimensions.find((d) => d.key === selectedDimensionKey) || dimensions[0];

  const dimensionIcons: Record<DimensionKey, React.FC<{ className?: string }>> = {
    technical_effort: Gauge,
    waiting_time: Clock,
    direct_cost: DollarSign,
    internal_dependencies: Users,
    dependency_risk: ShieldAlert,
    evidence_confidence: FileCheck2
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Explicit Disclaimer: Values Not Yet Calculated */}
      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 shadow-sm space-y-3">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-lime-400 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Dimension Evaluation Framework & Methodology
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-lime-300">Notice:</strong> Numerical readiness scores are intentionally not invented or simulated. Real readiness evaluation requires multi-vector analysis across engineering architecture, legal compliance, and vendor security verification.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Below are the six official dimensions through which every OAuth and API integration is audited prior to code commitment. Values and scores are labeled as <em>calculation pending engine activation</em>.
            </p>
          </div>
        </div>
      </div>

      {/* Provider Context Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300">Auditing Provider Demonstration Profile:</span>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">Sample Records</span>
        </div>
        <div className="flex items-center gap-2">
          {providers.map((p) => (
            <button
              key={p.slug}
              onClick={() => setSelectedProviderSlug(p.slug)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedProvider.slug === p.slug
                  ? 'bg-lime-400 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Six Dimensions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {dimensions.map((dim) => {
          const Icon = dimensionIcons[dim.key] || Gauge;
          const isSelected = selectedDimensionKey === dim.key;
          const evidenceEval = evaluateDimensionEvidence(dim.key, selectedProvider.claims || []);

          return (
            <div
              key={dim.key}
              onClick={() => setSelectedDimensionKey(dim.key)}
              className={`cursor-pointer rounded-xl border p-5 transition-all space-y-3 ${
                isSelected
                  ? 'border-lime-500/70 bg-gradient-to-b from-[#16233F] to-[#0F172A] shadow-lg shadow-lime-500/5'
                  : 'border-slate-800 bg-[#0F172A] hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`rounded-lg p-2 ${isSelected ? 'bg-lime-400 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{dim.name}</h4>
                    <span className="text-[10px] font-mono text-slate-400">{dim.metricUnits}</span>
                  </div>
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider border ${
                    !evidenceEval.hasSufficientEvidence
                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                      : 'border-lime-500/40 bg-lime-500/10 text-lime-300'
                  }`}
                >
                  {evidenceEval.ratingLabel}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                {dim.tagline}
              </p>

              {/* Qualitative Status for Selected Provider */}
              <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-2.5 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">{selectedProvider.name} Qualitative Spec:</span>
                  <span className="font-semibold text-slate-200">
                    {dim.key === 'waiting_time'
                      ? selectedProvider.waitingTimeRating
                      : dim.key === 'direct_cost'
                      ? selectedProvider.costTier
                      : dim.key === 'dependency_risk'
                      ? selectedProvider.dependencyRisk
                      : dim.key === 'technical_effort'
                      ? selectedProvider.complexity
                      : 'Audit Documented'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400">
                <span>{dim.rubricCriteria.length} evaluation checkpoints</span>
                <span className="font-medium text-lime-400 hover:underline">
                  Inspect Rubric &rarr;
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Dimension Deep Dive Details */}
      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-lime-400">
                Dimension Deep Dive
              </span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                Rubric Specification
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">{activeDimension.name}</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">{activeDimension.description}</p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-right">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Calculation Status</span>
            <span className="text-xs font-mono font-semibold text-amber-300 block mt-0.5">
              Score Withheld (Anti-Hallucination)
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Falsely precise numerical scores rejected
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Rubric Criteria */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-lime-400" />
              Evaluation Criteria & Checkpoints
            </h4>
            <div className="space-y-2 text-xs">
              {activeDimension.rubricCriteria.map((criterion, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-slate-300"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-mono font-semibold text-lime-400">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{criterion}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Common Pitfalls & Anti-Patterns */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Common Architectural Pitfalls
            </h4>
            <div className="space-y-2 text-xs">
              {activeDimension.commonPitfalls.map((pitfall, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-amber-200"
                >
                  <span className="text-amber-400 mt-0.5">•</span>
                  <span className="leading-relaxed">{pitfall}</span>
                </div>
              ))}
            </div>

            {/* Provider Contextual Summary */}
            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-xs space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider">
                {selectedProvider.name} Contextual Footprint
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {selectedProvider.summary}
              </p>
              <div className="pt-2 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Protocol: {selectedProvider.authMethod}</span>
                <button
                  onClick={() => onNavigate('guides')}
                  className="text-lime-400 hover:underline flex items-center gap-0.5"
                >
                  <span>Read Integration Guide</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
